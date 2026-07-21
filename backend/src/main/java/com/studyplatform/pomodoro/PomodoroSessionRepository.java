package com.studyplatform.pomodoro;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PomodoroSessionRepository extends JpaRepository<PomodoroSession, Long> {

    List<PomodoroSession> findByUserId(Long userId);

    @Query("SELECT p FROM PomodoroSession p WHERE p.user.id = :userId AND p.examPrep.id = :examPrepId ORDER BY p.id DESC")
    List<PomodoroSession> findByUserIdAndExamPrepId(@Param("userId") Long userId, @Param("examPrepId") Long examPrepId);
}
