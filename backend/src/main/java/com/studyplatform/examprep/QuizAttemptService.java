package com.studyplatform.examprep;

import com.studyplatform.goal.Goal;
import com.studyplatform.goal.GoalRepository;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Serviço responsável por gerenciar as tentativas de quizzes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuizAttemptService {

    private final QuizAttemptRepository quizAttemptRepository;
    private final ExamSimulationRepository examSimulationRepository;
    private final ExamPrepRepository examPrepRepository;
    private final UserRepository userRepository;
    private final GoalRepository goalRepository;
    private final ApplicationEventPublisher eventPublisher;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    @Transactional
    public QuizAttempt saveAttempt(Long examPrepId, int correctAnswers, int totalQuestions, String contentJson) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepRepository.findByIdAndUserId(examPrepId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Preparação de prova não encontrada"));

        int score = totalQuestions > 0 ? (int) Math.round((double) correctAnswers / totalQuestions * 100) : 0;

        QuizAttempt attempt = QuizAttempt.builder()
                .examPrep(examPrep)
                .correctAnswers(correctAnswers)
                .totalQuestions(totalQuestions)
                .score(score)
                .contentJson(contentJson)
                .build();

        QuizAttempt saved = quizAttemptRepository.save(attempt);
        log.info("Tentativa de quiz salva com ID: {} e Score: {} para a preparação ID: {}", saved.getId(), score, examPrepId);

        eventPublisher.publishEvent(new ExamPrepActivityEvent(this, examPrepId));

        return saved;
    }

    @Transactional
    public void recalcularMastery(Long examPrepId) {
        List<ExamSimulation> completedSimulations = examSimulationRepository.findByExamPrepId(examPrepId).stream()
                .filter(s -> s.getStatus() == SimulationStatus.COMPLETED || s.getStatus() == SimulationStatus.TIMED_OUT)
                .toList();
        List<QuizAttempt> quizAttempts = quizAttemptRepository.findByExamPrepId(examPrepId);

        int totalCount = completedSimulations.size() + quizAttempts.size();
        if (totalCount == 0) return;

        double sum = 0.0;
        for (ExamSimulation sim : completedSimulations) {
            sum += sim.getScore() != null ? sim.getScore() : 0.0;
        }
        for (QuizAttempt qa : quizAttempts) {
            sum += qa.getScore() != null ? qa.getScore() : 0.0;
        }

        int finalMastery = (int) Math.round(sum / totalCount);

        List<Goal> goals = goalRepository.findByExamPrepId(examPrepId);
        for (Goal goal : goals) {
            goal.updateMastery(finalMastery);
            goalRepository.save(goal);
        }
        log.info("Maestria da meta da preparação de prova ID: {} recalculada para: {}%", examPrepId, finalMastery);
    }
}
