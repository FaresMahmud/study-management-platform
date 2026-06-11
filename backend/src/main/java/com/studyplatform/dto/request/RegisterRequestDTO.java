package com.studyplatform.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO que representa os dados enviados pelo cliente ao se registrar.
 *
 * Separamos o DTO da entidade por segurança e flexibilidade:
 *   - O cliente nunca envia campos como id ou creationDate
 *   - As validações ficam aqui, não na entidade
 *   - Se a entidade mudar, o contrato da API não quebra
 *
 * As anotações de validação são processadas pelo Spring quando
 * usamos @Valid no Controller. Se alguma falhar, o
 * GlobalExceptionHandler captura e retorna um erro 400.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequestDTO {

    /**
     * @NotBlank → rejeita null, "" e "   " (só espaços)
     * @Size     → limita o tamanho para evitar dados absurdos no banco
     */
    @NotBlank(message = "O nome é obrigatório")
    @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres")
    private String nameUser;

    /**
     * @Email    → valida o formato do email (ex: usuario@dominio.com)
     * @NotBlank → garante que não está vazio
     */
    @NotBlank(message = "O email é obrigatório")
    @Email(message = "Informe um email válido")
    private String email;

    /**
     * @Size → senha mínima de 6 caracteres por segurança básica
     * Não usamos @NotBlank junto pois @Size já cobre o caso vazio
     */
    @NotBlank(message = "A senha é obrigatória")
    @Size(min = 6, max = 100, message = "A senha deve ter entre 6 e 100 caracteres")
    private String password;
}
