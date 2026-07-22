package com.studyplatform.examprep;

import com.studyplatform.user.User;
import com.studyplatform.subject.Subject;
import com.studyplatform.goal.Goal;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "exam_preps")
public class ExamPrep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "exam_date", nullable = false)
    private LocalDate examDate;

    @Column(name = "target_score", nullable = false)
    private Integer targetScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ExamPrepStatus status;

    @Column(name = "share_token", unique = true)
    private String shareToken;

    @Builder.Default
    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    private User user;

    @OneToMany(mappedBy = "examPrep", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    private List<Subject> subjects;

    @OneToMany(mappedBy = "examPrep", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    private List<Goal> goals;
}
