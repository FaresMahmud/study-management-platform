package com.studyplatform.session;
import com.studyplatform.session.StudySession;
import com.studyplatform.subject.Subject;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// Como StudySession não tem user_id direto, filtramos navegando pelo Subject.
// Spring Data entende o underscore: SubjectUserId = subject.user.id

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    // JOIN subjects WHERE user_id = ?
    Page<StudySession> findBySubjectUserId(Long userId, Pageable pageable);

    // JOIN subjects WHERE id = ? AND user_id = ?
    Optional<StudySession> findByIdAndSubjectUserId(Long id, Long userId);

    List<StudySession> findBySubjectId(Long subjectId);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(s.duration), 0) FROM StudySession s " +
            "WHERE s.subject.user.id = :userId " +
            "AND s.subject.id = :subjectId " +
            "AND s.sessionDate BETWEEN :startDate AND :endDate")
    Integer sumDurationBySubjectAndPeriod(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("subjectId") Long subjectId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(s.duration), 0) FROM StudySession s " +
            "WHERE s.subject.user.id = :userId " +
            "AND s.sessionDate BETWEEN :startDate AND :endDate")
    Integer sumDurationByUserAndPeriod(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);
}
