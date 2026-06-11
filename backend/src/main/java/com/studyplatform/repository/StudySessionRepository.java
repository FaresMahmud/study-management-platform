package com.studyplatform.repository;

import com.studyplatform.entity.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

// Como StudySession não tem user_id direto, filtramos navegando pelo Subject.
// Spring Data entende o underscore: SubjectUserId = subject.user.id
@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    // JOIN subjects WHERE user_id = ?
    List<StudySession> findBySubjectUserId(Long userId);

    // JOIN subjects WHERE id = ? AND user_id = ?
    Optional<StudySession> findByIdAndSubjectUserId(Long id, Long userId);

    List<StudySession> findBySubjectId(Long subjectId);
}
