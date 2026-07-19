package com.studyplatform.auth;
import com.studyplatform.auth.AuthService;
import com.studyplatform.auth.dto.AuthResponseDTO;
import com.studyplatform.auth.dto.LoginRequestDTO;
import com.studyplatform.auth.dto.RegisterRequestDTO;
import com.studyplatform.shared.config.OpenApiConfig;
import com.studyplatform.shared.exception.ErrorResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller responsável pelos endpoints públicos de autenticação.
 *
 * @SecurityRequirements({}) → sobrescreve a segurança global do OpenApiConfig
 * e marca estes endpoints como públicos no Swagger UI (sem cadeado).
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação", description = "Endpoints públicos de registro e login")
@SecurityRequirements({})
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/register
     */
    @Operation(
        summary = "Registrar novo usuário",
        description = "Cria uma nova conta e retorna o token JWT automaticamente"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Usuário registrado com sucesso",
            content = @Content(schema = @Schema(implementation = AuthResponseDTO.class))),
        @ApiResponse(responseCode = "400", description = "Dados inválidos ou email já cadastrado",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @PostMapping("/register")
    public ResponseEntity<AuthResponseDTO> register(
            @RequestBody @Valid RegisterRequestDTO request) {

        AuthResponseDTO response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * POST /api/auth/login
     */
    @Operation(
        summary = "Login",
        description = "Autentica o usuário e retorna o token JWT para usar nas demais requisições"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Login realizado com sucesso",
            content = @Content(schema = @Schema(implementation = AuthResponseDTO.class))),
        @ApiResponse(responseCode = "401", description = "Email ou senha inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(
            @RequestBody @Valid LoginRequestDTO request) {

        AuthResponseDTO response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}
