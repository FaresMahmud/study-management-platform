package com.studyplatform.goal;
import com.studyplatform.subject.Subject;
import com.studyplatform.user.User;
import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

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
@Table(name = "goals")
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    // Horas já estudadas — começa em 0 e é atualizado conforme o usuário avança
    @Column(name = "progress", nullable = false)
    private Double progress;

    // Quantidade de horas que o usuário quer atingir
    @Column(name = "objectiveHours", nullable = false)
    private Double objectiveHours;

    @Column(name = "startDateGoal", nullable = false)
    private LocalDate startDateGoal;

    @Column(name = "endDateGoal", nullable = false)
    private LocalDate endDateGoal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    private User user;

    // Subject opcional — nullable = true é o padrão, mas deixamos explícito pra ficar claro
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = true)
    @ToString.Exclude
    private Subject subject;

    /**
     * Calcula o percentual de conclusão da meta com base no progresso atual.
     * Retorna um valor arredondado com duas casas decimais, limitado a 100%.
     */
    public double getCompletionPercentage() {
        if (objectiveHours == null || objectiveHours <= 0) {
            return 0.0;
        }
        double percentage = (progress / objectiveHours) * 100.0;
        percentage = Math.min(percentage, 100.0);
        return Math.round(percentage * 100.0) / 100.0;
    }

    /**
     * Adiciona progresso em horas a esta meta.
     */
    public void addProgress(double hours) {
        if (hours > 0) {
            this.progress = (this.progress == null ? 0.0 : this.progress) + hours;
        }
    }
}
