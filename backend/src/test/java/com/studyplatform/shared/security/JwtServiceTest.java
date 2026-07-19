package com.studyplatform.shared.security;
import com.studyplatform.shared.security.JwtService;
import com.studyplatform.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testes unitários do JwtService.
 *
 * ReflectionTestUtils.setField → injeta valores nos campos @Value
 * sem precisar carregar o contexto do Spring.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("JwtService — Testes Unitários")
class JwtServiceTest {

    private JwtService jwtService;
    private User user;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();

        // Injeta os valores que viriam do application.properties
        ReflectionTestUtils.setField(jwtService, "secretKey",
                "chave-secreta-para-testes-unitarios-deve-ser-longa");
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 86400000L);

        user = User.builder()
                .id(1L)
                .nameUser("João Silva")
                .email("joao@email.com")
                .passwordUser("$2a$hash")
                .build();
    }

    @Test
    @DisplayName("generateToken → gera token não nulo para usuário válido")
    void generateToken_validUser_returnsNonNullToken() {
        // ACT
        String token = jwtService.generateToken(user);

        // ASSERT
        assertThat(token).isNotNull().isNotBlank();
    }

    @Test
    @DisplayName("generateToken → token contém 3 partes separadas por ponto (formato JWT)")
    void generateToken_validUser_returnsValidJwtFormat() {
        // ACT
        String token = jwtService.generateToken(user);

        // ASSERT — JWT sempre tem formato: header.payload.signature
        String[] parts = token.split("\\.");
        assertThat(parts).hasSize(3);
    }

    @Test
    @DisplayName("extractEmail → extrai email corretamente do token")
    void extractEmail_validToken_returnsCorrectEmail() {
        // ARRANGE
        String token = jwtService.generateToken(user);

        // ACT
        String extractedEmail = jwtService.extractEmail(token);

        // ASSERT
        assertThat(extractedEmail).isEqualTo("joao@email.com");
    }

    @Test
    @DisplayName("isTokenValid → retorna true para token válido e usuário correto")
    void isTokenValid_validTokenAndUser_returnsTrue() {
        // ARRANGE
        String token = jwtService.generateToken(user);

        // ACT
        boolean isValid = jwtService.isTokenValid(token, user);

        // ASSERT
        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("isTokenValid → retorna false para token de usuário diferente")
    void isTokenValid_differentUser_returnsFalse() {
        // ARRANGE — token gerado para joão
        String token = jwtService.generateToken(user);

        // Usuário diferente tentando usar o token do joão
        User anotherUser = User.builder()
                .id(2L)
                .email("maria@email.com")
                .passwordUser("$2a$hash")
                .build();

        // ACT
        boolean isValid = jwtService.isTokenValid(token, anotherUser);

        // ASSERT — token do joão não é válido para a maria
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("isTokenValid → retorna false para token expirado")
    void isTokenValid_expiredToken_returnsFalse() {
        // ARRANGE — cria JwtService com expiração de 1ms
        JwtService expiredJwtService = new JwtService();
        ReflectionTestUtils.setField(expiredJwtService, "secretKey",
                "chave-secreta-para-testes-unitarios-deve-ser-longa");
        ReflectionTestUtils.setField(expiredJwtService, "jwtExpiration", 1L);

        String token = expiredJwtService.generateToken(user);

        // Aguarda o token expirar
        try { Thread.sleep(10); } catch (InterruptedException ignored) {}

        // ACT
        boolean isValid = expiredJwtService.isTokenValid(token, user);

        // ASSERT
        assertThat(isValid).isFalse();
    }
}
