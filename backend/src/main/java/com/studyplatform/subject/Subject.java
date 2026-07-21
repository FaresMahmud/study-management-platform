package com.studyplatform.subject;
import com.studyplatform.goal.Goal;
import com.studyplatform.session.StudySession;
import com.studyplatform.user.User;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

// Representa uma matéria/área de estudo do usuário.
// Ao deletar um Subject, o Cascade garante que todas as sessões e metas vinculadas também somem.
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "subjects")
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "subjectName", nullable = false)
    private String subjectName;

    @Column(name = "subjectDescription", columnDefinition = "TEXT")
    private String subjectDescription;

    // Objeto de Valor (Value Object) contendo a cor hexadecimal
    @Embedded
    @AttributeOverride(name = "value", column = @Column(name = "color"))
    private Color color;

    // Dono da matéria. LAZY pra não trazer o User em toda query de Subject.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    private User user;

    // Preparação para prova vinculada (ExamPrep)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_prep_id")
    @ToString.Exclude
    private com.studyplatform.examprep.ExamPrep examPrep;

    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    private List<StudySession> studySessions = new ArrayList<>();

    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    private List<Goal> goals = new ArrayList<>();
}
