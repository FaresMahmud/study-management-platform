package com.studyplatform.flashcard;
import com.studyplatform.subject.Subject;
import com.studyplatform.summary.Summary;
import com.studyplatform.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "flashcards")
public class Flashcard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "front", nullable = false, columnDefinition = "TEXT")
    private String front;

    @Column(name = "back", nullable = false, columnDefinition = "TEXT")
    private String back;

    @Column(name = "next_review_date", nullable = false)
    private LocalDateTime nextReviewDate;

    @Embedded
    @AttributeOverride(name = "value", column = @Column(name = "box", nullable = false))
    private LeitnerBox box;

    @CreationTimestamp
    @Column(name = "creation_date", updatable = false)
    private LocalDateTime creationDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    @ToString.Exclude
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "summary_id")
    @ToString.Exclude
    private Summary summary;

    /**
     * Atualiza o estado da caixa Leitner (1 a 5) e calcula o agendamento da próxima
     * revisão com base na qualidade reportada pelo estudante ("easy", "good", "hard").
     */
    public void recordReview(String quality) {
        LeitnerBox currentBox = this.box == null ? LeitnerBox.initial() : this.box;
        this.box = currentBox.next(quality);
        this.nextReviewDate = java.time.LocalDateTime.now().plusDays(this.box.getIntervalDays());
    }
}
