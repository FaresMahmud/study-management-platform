package com.studyplatform.auth;
import com.studyplatform.auth.AuthService;
import com.studyplatform.auth.dto.AuthResponseDTO;
import com.studyplatform.auth.dto.LoginRequestDTO;
import com.studyplatform.auth.dto.RegisterRequestDTO;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.security.JwtService;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Testes unitários do AuthService.
 *
 * @ExtendWith(MockitoExtension.class) → inicializa os mocks do Mockito automaticamente.
 * Não carrega o contexto do Spring — é rápido e isolado.
 *
 * Convenção de nome dos testes:
 *   methodName_scenario_expectedResult
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService — Testes Unitários")
class AuthServiceTest {

    // @Mock → cria um mock (objeto falso) da dependência
    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    // @InjectMocks → cria o objeto real e injeta os mocks acima
    @InjectMocks
    private AuthService authService;

    private RegisterRequestDTO registerRequest;
    private LoginRequestDTO loginRequest;
    private User savedUser;

    /**
     * @BeforeEach → executado antes de cada teste.
     * Monta os objetos reutilizados para evitar repetição.
     */
    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequestDTO.builder()
                .nameUser("João Silva")
                .email("joao@email.com")
                .password("senha123")
                .build();

        loginRequest = LoginRequestDTO.builder()
                .email("joao@email.com")
                .password("senha123")
                .build();

        savedUser = User.builder()
                .id(1L)
                .nameUser("João Silva")
                .email("joao@email.com")
                .passwordUser("$2a$10$hashBcrypt")
                .build();
    }

    // ==================== TESTES DE REGISTRO ====================

    @Test
    @DisplayName("register → sucesso quando email não está cadastrado")
    void register_newEmail_returnsAuthResponse() {
        // ARRANGE — configura o comportamento dos mocks
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$hashBcrypt");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt.token.aqui");

        // ACT — executa o método sendo testado
        AuthResponseDTO response = authService.register(registerRequest);

        // ASSERT — verifica os resultados
        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwt.token.aqui");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getEmail()).isEqualTo("joao@email.com");
        assertThat(response.getNameUser()).isEqualTo("João Silva");

        // Verifica que a senha foi encodada antes de salvar
        verify(passwordEncoder).encode("senha123");
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("register → lança BusinessException quando email já existe")
    void register_duplicateEmail_throwsBusinessException() {
        // ARRANGE
        when(userRepository.existsByEmail("joao@email.com")).thenReturn(true);

        // ACT & ASSERT — verifica que a exceção correta é lançada
        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("email já está cadastrado");

        // Verifica que save NUNCA foi chamado quando email é duplicado
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("register → senha é sempre encodada com BCrypt")
    void register_always_encodesPassword() {
        // ARRANGE
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode("senha123")).thenReturn("$2a$10$hashBcrypt");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateToken(any())).thenReturn("token");

        // ACT
        authService.register(registerRequest);

        // ASSERT — garante que nunca salvamos senha em texto puro
        verify(passwordEncoder, times(1)).encode("senha123");
    }

    // ==================== TESTES DE LOGIN ====================

    @Test
    @DisplayName("login → sucesso com credenciais válidas")
    void login_validCredentials_returnsAuthResponse() {
        // ARRANGE
        when(authenticationManager.authenticate(any())).thenReturn(null);
        when(userRepository.findByEmail("joao@email.com")).thenReturn(Optional.of(savedUser));
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt.token.aqui");

        // ACT
        AuthResponseDTO response = authService.login(loginRequest);

        // ASSERT
        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwt.token.aqui");
        assertThat(response.getEmail()).isEqualTo("joao@email.com");
    }

    @Test
    @DisplayName("login → lança BadCredentialsException com senha inválida")
    void login_wrongPassword_throwsBadCredentialsException() {
        // ARRANGE — o AuthenticationManager lança exceção para credenciais inválidas
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Credenciais inválidas"));

        // ACT & ASSERT
        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(BadCredentialsException.class);
    }
}
