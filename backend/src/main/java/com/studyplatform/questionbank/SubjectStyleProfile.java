package com.studyplatform.questionbank;

import com.studyplatform.subject.Subject;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = "subject")
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "subject_style_profiles")
public class SubjectStyleProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false, unique = true)
    private Subject subject;

    @Column(name = "profile_json", nullable = false, columnDefinition = "TEXT")
    private String profileJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "detection_source", nullable = false)
    private DetectionSource detectionSource;

    @Column(name = "sample_exercises_found")
    private Integer sampleExercisesFound;

    @Builder.Default
    @Column(name = "needs_regeneration", nullable = false)
    private boolean needsRegeneration = false;

    @CreationTimestamp
    @Column(name = "generated_at")
    private LocalDateTime generatedAt;
}
