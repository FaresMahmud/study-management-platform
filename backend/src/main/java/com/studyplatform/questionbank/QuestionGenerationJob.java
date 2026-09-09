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
@Table(name = "question_generation_jobs")
public class QuestionGenerationJob {

    @Id
    @EqualsAndHashCode.Include
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Column(name = "requested_count", nullable = false)
    private Integer requestedCount;

    @Builder.Default
    @Column(name = "generated_count", nullable = false)
    private Integer generatedCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private JobStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "style_profile_json", columnDefinition = "TEXT")
    private String styleProfileJson;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;
}
