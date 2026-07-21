package com.studyplatform.goal.dto;
import com.studyplatform.goal.Goal;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de entrada para criação e atualização de Goal.
 *
 * subjectId é opcional — a meta pode ser geral ou vinculada a uma matéria.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalRequestDTO {

    @NotBlank(message = "O título da meta é obrigatório")
    @Size(min = 2, max = 150, message = "O título deve ter entre 2 e 150 caracteres")
    private String title;

    /**
     * Progresso inicial de domínio (0-100%).
     */
    @Min(value = 0, message = "O domínio mínimo é 0%")
    @Max(value = 100, message = "O domínio máximo é 100%")
    private Integer currentMastery;

    /**
     * Meta de domínio desejada (1-100%).
     */
    @NotNull(message = "A meta de domínio é obrigatória")
    @Min(value = 1, message = "A meta mínima de domínio é 1%")
    @Max(value = 100, message = "A meta máxima de domínio é 100%")
    private Integer targetMastery;

    @NotNull(message = "A data de início é obrigatória")
    private LocalDate startDateGoal;

    @NotNull(message = "A data de término é obrigatória")
    private LocalDate endDateGoal;

    /**
     * Id da matéria associada — OPCIONAL.
     */
    private Long subjectId;

    /**
     * Id da preparação para prova associada — OPCIONAL.
     */
    private Long examPrepId;
}
