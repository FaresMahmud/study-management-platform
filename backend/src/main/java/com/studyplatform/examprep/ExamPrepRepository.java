package com.studyplatform.examprep;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExamPrepRepository extends JpaRepository<ExamPrep, Long> {
    List<ExamPrep> findByUser_Id(Long userId);
    Optional<ExamPrep> findByIdAndUserId(Long id, Long userId);
    Optional<ExamPrep> findByShareToken(UUID shareToken);
}
