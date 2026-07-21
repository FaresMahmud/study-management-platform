package com.studyplatform.examprep;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositório JPA para a entidade QuizAttempt.
 */
@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findByExamPrepId(Long examPrepId);
    List<QuizAttempt> findByExamPrepUserId(Long userId);
}
