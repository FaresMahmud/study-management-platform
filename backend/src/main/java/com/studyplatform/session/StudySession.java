package com.studyplatform.session;
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

// Representa uma sessão de estudo registrada.
// O usuário é resolvido sempre via Subject (StudySession → Subject → User),
// por isso não há user_id direto aqui.
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "study_sessions")
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    // Duração em minutos (ex: 90 = 1h30)
    @Column(name = "duration", nullable = false)
    private Integer duration;

    @Column(name = "sessionDate", nullable = false)
    private LocalDate sessionDate;

    // Campo livre pra o usuário anotar o que estudou
    @Column(name = "observations", columnDefinition = "TEXT")
    private String observations;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    @ToString.Exclude
    private Subject subject;
}
