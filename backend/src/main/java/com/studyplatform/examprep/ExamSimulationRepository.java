package com.studyplatform.examprep;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositório JPA para a entidade ExamSimulation.
 */
@Repository
public interface ExamSimulationRepository extends JpaRepository<ExamSimulation, Long> {
    List<ExamSimulation> findByExamPrepId(Long examPrepId);
    Optional<ExamSimulation> findByIdAndExamPrepUserId(Long id, Long userId);
}
