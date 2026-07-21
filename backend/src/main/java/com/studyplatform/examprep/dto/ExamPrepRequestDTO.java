package com.studyplatform.examprep.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamPrepRequestDTO {

    @NotBlank(message = "O título é obrigatório")
    @Size(max = 255, message = "O título deve ter no máximo 255 caracteres")
    private String title;

    @NotNull(message = "A data da prova é obrigatória")
    private LocalDate examDate;

    @NotNull(message = "A meta de score é obrigatória")
    @Min(value = 0, message = "O score mínimo é 0")
    @Max(value = 100, message = "O score máximo é 100")
    private Integer targetScore;

    @NotBlank(message = "O status é obrigatório")
    private String status; // ACTIVE, COMPLETED, ARCHIVED
}
