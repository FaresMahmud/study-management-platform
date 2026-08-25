package com.studyplatform.examprep;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositório JPA para a entidade ExamSimulation.
 */
@Repository
public interface ExamSimulationRepository extends JpaRepository<ExamSimulation, Long> {
    List<ExamSimulation> findByExamPrepId(Long examPrepId);

    @EntityGraph(attributePaths = {"examPrep", "examPrep.user"})
    Optional<ExamSimulation> findByIdAndExamPrepUserId(Long id, Long userId);

    @Query("SELECT es FROM ExamSimulation es JOIN FETCH es.examPrep ep JOIN FETCH ep.user WHERE es.id = :id")
    Optional<ExamSimulation> findByIdWithExamPrep(@Param("id") Long id);
}
