package com.studyplatform.examprep.simulation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamSimulationRepository extends JpaRepository<ExamSimulation, Long> {
    List<ExamSimulation> findByUserId(Long userId);
    List<ExamSimulation> findByExamPrepId(Long examPrepId);
}
