package com.studyplatform.repository;

import com.studyplatform.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GoalRepository extends JpaRepository<Goal, Long> {

    List<Goal> findByUserId(Long userId);

    Optional<Goal> findByIdAndUserId(Long id, Long userId);

    List<Goal> findBySubjectId(Long subjectId);
}
