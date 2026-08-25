package com.studyplatform.examprep;

import com.fasterxml.jackson.databind.ObjectMapper;

import com.studyplatform.examprep.dto.ExamSimulationResponseDTO;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ExamSimulationServiceTest {

    @Mock
    private ExamSimulationRepository examSimulationRepository;

    @Mock
    private ExamPrepRepository examPrepRepository;

    @Mock
    private StudyContextService studyContextService;

    @Mock
    private QuestionGenerator questionGenerator;

    @Mock
    private QuizAttemptService quizAttemptService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private SecurityContext securityContext;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Mock
    private com.studyplatform.shared.security.SecurityService securityService;

    @Mock
    private org.springframework.cache.CacheManager cacheManager;

    @InjectMocks
    private ExamSimulationService examSimulationService;

    private User user;
    private ExamPrep examPrep;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).email("student@studyflow.com").build();
        examPrep = ExamPrep.builder().id(1L).user(user).title("Test Exam").build();

        SecurityContextHolder.setContext(securityContext);
    }

    // ==================== START SIMULATION TESTS ====================

    @Test
    void testStartSimulationNoMaterial() {
        when(securityService.getAuthenticatedUser()).thenReturn(user);
        when(examPrepRepository.findByIdAndUserId(eq(1L), eq(1L))).thenReturn(Optional.of(examPrep));
        when(studyContextService.getContextTextForExamPrep(eq(1L))).thenReturn("");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> examSimulationService.startSimulation(1L));

        assertTrue(ex.getMessage().contains("material de estudo"));
        verify(examSimulationRepository, never()).save(any());
    }

    @Test
    void testStartSimulationNullContext() {
        when(securityService.getAuthenticatedUser()).thenReturn(user);
        when(examPrepRepository.findByIdAndUserId(eq(1L), eq(1L))).thenReturn(Optional.of(examPrep));
        when(studyContextService.getContextTextForExamPrep(eq(1L))).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> examSimulationService.startSimulation(1L));

        assertTrue(ex.getMessage().contains("material de estudo"));
    }

    @Test
    void testStartSimulationGeminiNotConfigured() {
        when(securityService.getAuthenticatedUser()).thenReturn(user);
        when(examPrepRepository.findByIdAndUserId(eq(1L), eq(1L))).thenReturn(Optional.of(examPrep));
        when(studyContextService.getContextTextForExamPrep(eq(1L))).thenReturn("Conteúdo de estudo");
        when(questionGenerator.isConfigured()).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> examSimulationService.startSimulation(1L));

        assertTrue(ex.getMessage().contains("não está configurado"));
        verify(examSimulationRepository, never()).save(any());
    }

    @Test
    void testStartSimulationGeminiFailure() throws Exception {
        when(securityService.getAuthenticatedUser()).thenReturn(user);
        when(examPrepRepository.findByIdAndUserId(eq(1L), eq(1L))).thenReturn(Optional.of(examPrep));
        when(studyContextService.getContextTextForExamPrep(eq(1L))).thenReturn("Conteúdo de estudo");
        when(questionGenerator.isConfigured()).thenReturn(true);
        when(questionGenerator.generateContent(anyString())).thenThrow(new RuntimeException("API error"));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> examSimulationService.startSimulation(1L));

        assertTrue(ex.getMessage().contains("Falha ao gerar questões"));
        verify(examSimulationRepository, never()).save(any());
    }

    @Test
    void testStartSimulationInvalidJson() throws Exception {
        when(securityService.getAuthenticatedUser()).thenReturn(user);
        when(examPrepRepository.findByIdAndUserId(eq(1L), eq(1L))).thenReturn(Optional.of(examPrep));
        when(studyContextService.getContextTextForExamPrep(eq(1L))).thenReturn("Conteúdo de estudo");
        when(questionGenerator.isConfigured()).thenReturn(true);
        when(questionGenerator.generateContent(anyString())).thenReturn("not valid json {{{");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> examSimulationService.startSimulation(1L));

        assertTrue(ex.getMessage().contains("formato inválido"));
        verify(examSimulationRepository, never()).save(any());
    }

    @Test
    void testStartSimulationEmptyArray() throws Exception {
        when(securityService.getAuthenticatedUser()).thenReturn(user);
        when(examPrepRepository.findByIdAndUserId(eq(1L), eq(1L))).thenReturn(Optional.of(examPrep));
        when(studyContextService.getContextTextForExamPrep(eq(1L))).thenReturn("Conteúdo de estudo");
        when(questionGenerator.isConfigured()).thenReturn(true);
        when(questionGenerator.generateContent(anyString())).thenReturn("[]");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> examSimulationService.startSimulation(1L));

        assertTrue(ex.getMessage().contains("não retornou questões válidas"));
    }

    // ==================== FINISH SIMULATION TESTS ====================

    @Test
    void testFinishSimulationSuccess() {
        when(securityService.getAuthenticatedUser()).thenReturn(user);

        String contentJson = "[\n" +
                "  {\n" +
                "    \"question\": \"Q1\",\n" +
                "    \"options\": {\"A\": \"OptA\", \"B\": \"OptB\"},\n" +
                "    \"correctAnswer\": \"A\"\n" +
                "  },\n" +
                "  {\n" +
                "    \"question\": \"Q2\",\n" +
                "    \"options\": {\"A\": \"OptA\", \"B\": \"OptB\"},\n" +
                "    \"correctAnswer\": \"B\"\n" +
                "  },\n" +
                "  {\n" +
                "    \"question\": \"Q3\",\n" +
                "    \"options\": {\"A\": \"OptA\", \"B\": \"OptB\"},\n" +
                "    \"correctAnswer\": \"B\"\n" +
                "  }\n" +
                "]";

        ExamSimulation simulation = ExamSimulation.builder()
                .id(10L)
                .examPrep(examPrep)
                .startTime(LocalDateTime.now())
                .status(SimulationStatus.STARTED)
                .contentJson(contentJson)
                .build();

        when(examSimulationRepository.findByIdAndExamPrepUserId(eq(10L), eq(1L))).thenReturn(Optional.of(simulation));
        when(examSimulationRepository.save(any(ExamSimulation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(examSimulationRepository.findByIdWithExamPrep(eq(10L))).thenReturn(Optional.of(simulation));

        Map<Integer, String> studentAnswers = Map.of(
                0, "A", // Correct
                1, "B", // Correct
                2, "A"  // Incorrect
        );

        ExamSimulationResponseDTO result = examSimulationService.finishSimulation(10L, studentAnswers);

        assertNotNull(result);
        assertEquals(SimulationStatus.COMPLETED, result.getStatus());
        assertEquals(67, result.getScore());
        verify(eventPublisher, times(1)).publishEvent(any(ExamPrepActivityEvent.class));
    }

    @Test
    void testFinishSimulationTimeout() {
        when(securityService.getAuthenticatedUser()).thenReturn(user);

        ExamSimulation simulation = ExamSimulation.builder()
                .id(10L)
                .examPrep(examPrep)
                .startTime(LocalDateTime.now().minusMinutes(16))
                .status(SimulationStatus.STARTED)
                .contentJson("[]")
                .build();

        when(examSimulationRepository.findByIdAndExamPrepUserId(eq(10L), eq(1L))).thenReturn(Optional.of(simulation));
        when(examSimulationRepository.save(any(ExamSimulation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(examSimulationRepository.findByIdWithExamPrep(eq(10L))).thenReturn(Optional.of(simulation));

        ExamSimulationResponseDTO result = examSimulationService.finishSimulation(10L, Map.of());

        assertNotNull(result);
        assertEquals(SimulationStatus.TIMED_OUT, result.getStatus());
    }

    @Test
    void testFinishSimulationAlreadyFinished() {
        when(securityService.getAuthenticatedUser()).thenReturn(user);

        ExamSimulation simulation = ExamSimulation.builder()
                .id(10L)
                .examPrep(examPrep)
                .startTime(LocalDateTime.now())
                .status(SimulationStatus.COMPLETED)
                .contentJson("[]")
                .build();

        when(examSimulationRepository.findByIdAndExamPrepUserId(eq(10L), eq(1L))).thenReturn(Optional.of(simulation));

        assertThrows(BusinessException.class, () -> examSimulationService.finishSimulation(10L, Map.of()));
    }
}
