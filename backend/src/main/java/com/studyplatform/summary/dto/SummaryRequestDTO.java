package com.studyplatform.summary.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SummaryRequestDTO {

    @NotBlank(message = "O título do resumo é obrigatório")
    @Size(min = 1, max = 150, message = "O título deve ter entre 1 e 150 caracteres")
    private String title;

    @NotBlank(message = "O conteúdo do resumo é obrigatório")
    private String content;

    @NotNull(message = "A matéria associada é obrigatória")
    private Long subjectId;
}
