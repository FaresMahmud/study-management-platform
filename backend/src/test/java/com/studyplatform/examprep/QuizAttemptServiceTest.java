package com.studyplatform.examprep;

import com.studyplatform.goal.Goal;
import com.studyplatform.goal.GoalRepository;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class QuizAttemptServiceTest {

    @Mock
    private QuizAttemptRepository quizAttemptRepository;

    @Mock
    private ExamSimulationRepository examSimulationRepository;

    @Mock
    private ExamPrepRepository examPrepRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private QuizAttemptService quizAttemptService;

    private User user;
    private ExamPrep examPrep;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).email("student@studyflow.com").build();
        examPrep = ExamPrep.builder().id(1L).user(user).build();

        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void testSaveAttemptAndRecalculateMastery() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("student@studyflow.com");
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));
        when(examPrepRepository.findByIdAndUserId(eq(1L), eq(1L))).thenReturn(Optional.of(examPrep));

        QuizAttempt attempt = QuizAttempt.builder()
                .id(1L)
                .examPrep(examPrep)
                .correctAnswers(2)
                .totalQuestions(3)
                .score(67)
                .contentJson("[]")
                .build();

        when(quizAttemptRepository.save(any(QuizAttempt.class))).thenReturn(attempt);

        // Recalculação de Maestria
        when(examSimulationRepository.findByExamPrepId(eq(1L))).thenReturn(Collections.emptyList());
        when(quizAttemptRepository.findByExamPrepId(eq(1L))).thenReturn(List.of(attempt));

        Goal goal = Goal.builder().id(1L).examPrep(examPrep).currentMastery(0).build();
        when(goalRepository.findByExamPrepId(eq(1L))).thenReturn(List.of(goal));

        QuizAttempt result = quizAttemptService.saveAttempt(1L, 2, 3, "[]");
        quizAttemptService.recalcularMastery(1L);

        assertNotNull(result);
        assertEquals(67, result.getScore());
        assertEquals(67, goal.getCurrentMastery());
        verify(quizAttemptRepository, times(1)).save(any(QuizAttempt.class));
        verify(goalRepository, times(1)).save(goal);
    }
}
