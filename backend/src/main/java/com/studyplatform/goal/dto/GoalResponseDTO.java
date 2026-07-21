package com.studyplatform.goal.dto;
import com.studyplatform.goal.Goal;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.dto.SubjectResponseDTO;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de saída para Goal.
 *
 * Inclui percentual de conclusão calculado para facilitar
 * a exibição no frontend (barra de progresso, etc).
 *
 * Subject é opcional — pode ser null se a meta for geral.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalResponseDTO {

    private Long id;
    private String title;
    private Integer currentMastery;
    private Integer targetMastery;
    private LocalDate startDateGoal;
    private LocalDate endDateGoal;

    /**
     * Percentual de conclusão calculado pelo Mapper.
     * Ex: currentMastery=30, targetMastery=60 → completionPercentage=50.0
     */
    private Double completionPercentage;

    // Dados do dono
    private Long userId;
    private String userName;

    // Dados do Subject associado — null se a meta for geral
    private SubjectResponseDTO subject;

    // Dados da preparação para prova associada (ExamPrep)
    private Long examPrepId;
    private String examPrepTitle;
}
