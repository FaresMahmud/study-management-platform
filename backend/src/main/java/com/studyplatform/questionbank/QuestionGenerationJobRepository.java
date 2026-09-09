package com.studyplatform.questionbank;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionGenerationJobRepository extends JpaRepository<QuestionGenerationJob, String> {
    List<QuestionGenerationJob> findBySubjectIdAndStatusIn(Long subjectId, List<JobStatus> statuses);
    Optional<QuestionGenerationJob> findTopBySubjectIdOrderByCreatedAtDesc(Long subjectId);
}
