package com.studyplatform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de entrada para criação e atualização de Subject.
 *
 * Usado tanto no POST quanto no PUT — os campos são os mesmos.
 * O Service trata a diferença entre criar e atualizar.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectRequestDTO {

    @NotBlank(message = "O nome da matéria é obrigatório")
    @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres")
    private String subjectName;

    @Size(max = 500, message = "A descrição deve ter no máximo 500 caracteres")
    private String subjectDescription;

    /**
     * Valida que a cor está no formato hexadecimal correto.
     * Aceita: #FFF, #FFFFFF, #fff, #ffffff
     * O campo não é obrigatório — o frontend pode definir uma cor padrão.
     */
    @Pattern(
        regexp = "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
        message = "A cor deve estar no formato hexadecimal (ex: #FF5733)"
    )
    private String color;
}
