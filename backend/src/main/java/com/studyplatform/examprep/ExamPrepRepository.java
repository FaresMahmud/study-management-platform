package com.studyplatform.examprep;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExamPrepRepository extends JpaRepository<ExamPrep, Long> {

    Page<ExamPrep> findByUserId(Long userId, Pageable pageable);

    Optional<ExamPrep> findByIdAndUserId(Long id, Long userId);

    Optional<ExamPrep> findByShareToken(String shareToken);
}
