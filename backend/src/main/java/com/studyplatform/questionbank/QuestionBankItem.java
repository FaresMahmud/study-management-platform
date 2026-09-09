package com.studyplatform.questionbank;

import com.studyplatform.subject.Subject;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"subject", "styleProfile"})
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "question_bank_items", indexes = {
    @Index(name = "idx_qbank_subject_status", columnList = "subject_id, status"),
    @Index(name = "idx_qbank_subject_created", columnList = "subject_id, created_at")
})
public class QuestionBankItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Column(name = "source_file_ids", columnDefinition = "TEXT")
    private String sourceFileIds;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false)
    private QuestionFormat format;

    @Column(name = "alternatives", nullable = false, columnDefinition = "TEXT")
    private String alternatives;

    @Column(name = "correct_alternative_index")
    private Integer correctAlternativeIndex;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "topic_hint")
    private String topicHint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "style_profile_id")
    private SubjectStyleProfile styleProfile;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private QuestionBankStatus status = QuestionBankStatus.ACTIVE;

    @Builder.Default
    @Column(name = "times_used", nullable = false)
    private Integer timesUsed = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
