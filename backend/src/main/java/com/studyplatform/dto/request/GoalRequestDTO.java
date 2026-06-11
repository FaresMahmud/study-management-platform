package com.studyplatform.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

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
     * Progresso inicial — normalmente 0 ao criar.
     * Não pode ser negativo.
     */
    @NotNull(message = "O progresso é obrigatório")
    @DecimalMin(value = "0.0", message = "O progresso não pode ser negativo")
    private Double progress;

    /**
     * Total de horas objetivo. Mínimo de 0.5 (30 minutos).
     */
    @NotNull(message = "O objetivo em horas é obrigatório")
    @DecimalMin(value = "0.5", message = "O objetivo mínimo é de 0.5 horas (30 minutos)")
    private Double objectiveHours;

    @NotNull(message = "A data de início é obrigatória")
    private LocalDate startDateGoal;

    @NotNull(message = "A data de término é obrigatória")
    private LocalDate endDateGoal;

    /**
     * Id da matéria associada — OPCIONAL.
     * Se informado, o Service valida que pertence ao usuário autenticado.
     */
    private Long subjectId;
}
