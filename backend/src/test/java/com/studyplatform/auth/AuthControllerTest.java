package com.studyplatform.auth;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplatform.auth.AuthController;
import com.studyplatform.auth.AuthService;
import com.studyplatform.auth.dto.AuthResponseDTO;
import com.studyplatform.auth.dto.LoginRequestDTO;
import com.studyplatform.auth.dto.RegisterRequestDTO;
import com.studyplatform.shared.config.SecurityConfig;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.security.JwtService;
import com.studyplatform.shared.security.UserDetailsServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração do AuthController.
 *
 * @WebMvcTest → carrega apenas a camada web (Controller + Security).
 * Não carrega o banco de dados — é mais rápido que @SpringBootTest.
 *
 * MockMvc → simula requisições HTTP sem subir um servidor real.
 */
@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
@DisplayName("AuthController — Testes de Integração")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    // ObjectMapper → serializa/deserializa JSON nos testes
    @Autowired
    private ObjectMapper objectMapper;

    // @MockBean → substitui o bean real do Spring pelo mock do Mockito
    @MockBean
    private AuthService authService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    // ==================== TESTES DE REGISTRO ====================

    @Test
    @DisplayName("POST /api/auth/register → 201 Created com dados válidos")
    void register_validRequest_returns201() throws Exception {
        // ARRANGE
        RegisterRequestDTO request = RegisterRequestDTO.builder()
                .nameUser("João Silva")
                .email("joao@email.com")
                .password("senha123")
                .build();

        AuthResponseDTO response = AuthResponseDTO.builder()
                .token("jwt.token")
                .tokenType("Bearer")
                .id(1L)
                .nameUser("João Silva")
                .email("joao@email.com")
                .build();

        when(authService.register(any(RegisterRequestDTO.class))).thenReturn(response);

        // ACT & ASSERT
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("jwt.token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.email").value("joao@email.com"))
                // Garante que a senha NUNCA aparece na resposta
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/auth/register → 400 quando email é inválido")
    void register_invalidEmail_returns400() throws Exception {
        // ARRANGE — email sem @
        RegisterRequestDTO request = RegisterRequestDTO.builder()
                .nameUser("João")
                .email("emailinvalido")
                .password("senha123")
                .build();

        // ACT & ASSERT — Bean Validation retorna 400 antes de chamar o Service
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("POST /api/auth/register → 400 quando senha é muito curta")
    void register_shortPassword_returns400() throws Exception {
        // ARRANGE — senha com menos de 6 caracteres
        RegisterRequestDTO request = RegisterRequestDTO.builder()
                .nameUser("João")
                .email("joao@email.com")
                .password("123") // muito curta
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/register → 400 quando email já está cadastrado")
    void register_duplicateEmail_returns400() throws Exception {
        // ARRANGE
        RegisterRequestDTO request = RegisterRequestDTO.builder()
                .nameUser("João")
                .email("joao@email.com")
                .password("senha123")
                .build();

        when(authService.register(any())).thenThrow(new BusinessException("Este email já está cadastrado"));

        // ACT & ASSERT
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Este email já está cadastrado"));
    }

    // ==================== TESTES DE LOGIN ====================

    @Test
    @DisplayName("POST /api/auth/login → 200 OK com credenciais válidas")
    void login_validCredentials_returns200() throws Exception {
        // ARRANGE
        LoginRequestDTO request = LoginRequestDTO.builder()
                .email("joao@email.com")
                .password("senha123")
                .build();

        AuthResponseDTO response = AuthResponseDTO.builder()
                .token("jwt.token")
                .tokenType("Bearer")
                .email("joao@email.com")
                .build();

        when(authService.login(any(LoginRequestDTO.class))).thenReturn(response);

        // ACT & ASSERT
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt.token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    @Test
    @DisplayName("POST /api/auth/login → 401 com credenciais inválidas")
    void login_invalidCredentials_returns401() throws Exception {
        // ARRANGE
        LoginRequestDTO request = LoginRequestDTO.builder()
                .email("joao@email.com")
                .password("senhaErrada")
                .build();

        when(authService.login(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        // ACT & ASSERT
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Email ou senha inválidos"));
    }

    @Test
    @DisplayName("POST /api/auth/login → 400 quando campos estão vazios")
    void login_emptyFields_returns400() throws Exception {
        // ARRANGE — request vazio
        LoginRequestDTO request = LoginRequestDTO.builder()
                .email("")
                .password("")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
