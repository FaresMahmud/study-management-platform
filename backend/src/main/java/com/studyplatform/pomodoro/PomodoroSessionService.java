package com.studyplatform.pomodoro;

import com.studyplatform.examprep.ExamPrep;
import com.studyplatform.examprep.ExamPrepRepository;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PomodoroSessionService {

    private final PomodoroSessionRepository pomodoroSessionRepository;
    private final ExamPrepRepository examPrepRepository;
    private final UserRepository userRepository;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    @Transactional
    public PomodoroSession startSession(Long examPrepId, Integer durationMinutes) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepRepository.findByIdAndUserId(examPrepId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Preparação de prova não encontrada"));

        PomodoroSession session = PomodoroSession.builder()
                .examPrep(examPrep)
                .user(user)
                .startedAt(LocalDateTime.now())
                .durationMinutes(durationMinutes != null ? durationMinutes : 25)
                .completed(false)
                .build();

        PomodoroSession saved = pomodoroSessionRepository.save(session);
        log.info("Sessão Pomodoro iniciada com ID: {} para a preparação ID: {}", saved.getId(), examPrepId);
        return saved;
    }

    @Transactional
    public PomodoroSession completeSession(Long sessionId, String contentConsumed) {
        User user = getAuthenticatedUser();
        PomodoroSession session = pomodoroSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão Pomodoro não encontrada"));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Acesso negado para esta sessão Pomodoro.");
        }

        session.setCompleted(true);
        session.setContentConsumed(contentConsumed);

        PomodoroSession saved = pomodoroSessionRepository.save(session);
        log.info("Sessão Pomodoro finalizada e completada com ID: {}", saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<PomodoroSession> getSessions(Long examPrepId) {
        User user = getAuthenticatedUser();
        return pomodoroSessionRepository.findByUserIdAndExamPrepId(user.getId(), examPrepId);
    }
}
