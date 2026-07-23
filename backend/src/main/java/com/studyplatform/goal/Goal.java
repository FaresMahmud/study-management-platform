package com.studyplatform.goal;
import com.studyplatform.subject.Subject;
import com.studyplatform.user.User;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

// Representa uma meta de estudo. O Subject é opcional:
// o usuário pode criar metas gerais (ex: "estudar 100h no mês") sem vincular a uma matéria.
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "goals")
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "target_mastery", nullable = false)
    private Integer targetMastery;

    @Column(name = "current_mastery", nullable = false)
    private Integer currentMastery;

    @Column(name = "startDateGoal", nullable = false)
    private LocalDate startDateGoal;

    @Column(name = "endDateGoal", nullable = false)
    private LocalDate endDateGoal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    private User user;

    // Subject opcional
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = true)
    @ToString.Exclude
    private Subject subject;

    // ExamPrep opcional/associada
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_prep_id", nullable = true)
    @ToString.Exclude
    private com.studyplatform.examprep.ExamPrep examPrep;

    @CreatedDate
    @Column(name = "created_at", nullable = true, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = true)
    private LocalDateTime updatedAt;

    /**
     * Retorna a porcentagem de conclusão com base no progresso de domínio atual.
     */
    public double getCompletionPercentage() {
        if (targetMastery == null || targetMastery <= 0) {
            return 0.0;
        }
        double current = currentMastery == null ? 0.0 : currentMastery.doubleValue();
        double percentage = (current / targetMastery.doubleValue()) * 100.0;
        percentage = Math.min(percentage, 100.0);
        return Math.round(percentage * 100.0) / 100.0;
    }

    /**
     * Atualiza o domínio atual da meta.
     */
    public void updateMastery(int currentMastery) {
        this.currentMastery = Math.clamp(currentMastery, 0, 100);
    }
}
