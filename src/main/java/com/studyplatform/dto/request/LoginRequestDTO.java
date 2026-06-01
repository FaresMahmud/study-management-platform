package com.studyplatform.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO que representa os dados enviados pelo cliente ao fazer login.
 *
 * Intencionalmente mais simples que o RegisterRequestDTO:
 * no login só precisamos de email e senha para autenticar.
 * Não validamos tamanho de senha aqui pois se a senha não bater,
 * o erro será de credenciais inválidas, não de validação.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequestDTO {

    @NotBlank(message = "O email é obrigatório")
    @Email(message = "Informe um email válido")
    private String email;

    @NotBlank(message = "A senha é obrigatória")
    private String password;
}
