package com.studyplatform.examprep;

import com.fasterxml.jackson.databind.ObjectMapper;

import com.studyplatform.examprep.dto.ExamSimulationResponseDTO;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.user.User;
import com.studyplatform.questionbank.JobStatus;
import com.studyplatform.questionbank.QuestionBankItem;
import com.studyplatform.questionbank.QuestionBankService;
import com.studyplatform.questionbank.QuestionBankStatus;
import com.studyplatform.questionbank.QuestionFormat;
import com.studyplatform.questionbank.QuestionGenerationJobService;
import com.studyplatform.questionbank.dto.QuestionGenerationJobResponseDTO;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectRepository;
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
import java.util.Collections;
import java.util.List;
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

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private QuestionBankService questionBankService;

    @Mock
    private QuestionGenerationJobService questionGenerationJobService;

    @InjectMocks
    private ExamSimulationService examSimulationService;

    private User user;
    private ExamPrep examPrep;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).email("student@studyflow.com").build();
        examPrep = ExamPrep.builder().id(1L).user(user).title("Test Exam").build();

        SecurityContextHolder.setContext(securityContext);
        lenient().when(subjectRepository.findByExamPrepId(any())).thenReturn(Collections.emptyList());
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

    @Test
    void testFinishSimulationDynamicScore7Questions5Correct() {
        when(securityService.getAuthenticatedUser()).thenReturn(user);

        // 7 questions JSON
        StringBuilder jsonBuilder = new StringBuilder("[");
        for (int i = 0; i < 7; i++) {
            if (i > 0) jsonBuilder.append(",");
            jsonBuilder.append(String.format("{\"question\": \"Q%d\", \"options\": {\"A\": \"OptA\", \"B\": \"OptB\"}, \"correctAnswer\": \"A\"}", i));
        }
        jsonBuilder.append("]");

        ExamSimulation simulation = ExamSimulation.builder()
                .id(20L)
                .examPrep(examPrep)
                .startTime(LocalDateTime.now())
                .status(SimulationStatus.STARTED)
                .contentJson(jsonBuilder.toString())
                .build();

        when(examSimulationRepository.findByIdAndExamPrepUserId(eq(20L), eq(1L))).thenReturn(Optional.of(simulation));
        when(examSimulationRepository.save(any(ExamSimulation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(examSimulationRepository.findByIdWithExamPrep(eq(20L))).thenReturn(Optional.of(simulation));

        // 5 correct (indices 0, 1, 2, 3, 4 with "A"), 2 incorrect (indices 5, 6 with "B")
        Map<Integer, String> studentAnswers = Map.of(
                0, "A",
                1, "A",
                2, "A",
                3, "A",
                4, "A",
                5, "B",
                6, "B"
        );

        ExamSimulationResponseDTO result = examSimulationService.finishSimulation(20L, studentAnswers);

        assertNotNull(result);
        assertEquals(SimulationStatus.COMPLETED, result.getStatus());
        // 5 / 7 * 100 = 71.428... -> 71%
        assertEquals(71, result.getScore());
    }

    @Test
    void testStartSimulationFromQuestionBankFull() throws Exception {
        when(securityService.getAuthenticatedUser()).thenReturn(user);

        Subject subject = Subject.builder().id(100L).subjectName("Direito Administrativo").examPrep(examPrep).build();
        when(subjectRepository.findByIdAndUserId(eq(100L), eq(1L))).thenReturn(Optional.of(subject));

        List<QuestionBankItem> bankItems = List.of(
                QuestionBankItem.builder().id(1L).subject(subject).questionText("Q1").format(QuestionFormat.TRUE_FALSE).correctAlternativeIndex(0).alternatives("[\"CERTO\", \"ERRADO\"]").build(),
                QuestionBankItem.builder().id(2L).subject(subject).questionText("Q2").format(QuestionFormat.TRUE_FALSE).correctAlternativeIndex(1).alternatives("[\"CERTO\", \"ERRADO\"]").build()
        );

        when(questionBankService.pickQuestionsForSimulation(eq(100L), eq(2))).thenReturn(bankItems);
        when(examSimulationRepository.save(any(ExamSimulation.class))).thenAnswer(invocation -> {
            ExamSimulation s = invocation.getArgument(0);
            s.setId(50L);
            return s;
        });
        when(examSimulationRepository.findByIdWithExamPrep(anyLong())).thenAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            return Optional.of(ExamSimulation.builder()
                    .id(id)
                    .examPrep(examPrep)
                    .startTime(LocalDateTime.now())
                    .status(SimulationStatus.STARTED)
                    .contentJson("[]")
                    .build());
        });

        ExamSimulationResponseDTO response = examSimulationService.startSimulation(null, 100L, 2);

        assertNotNull(response);
        assertEquals(50L, response.getId());
        assertFalse(Boolean.TRUE.equals(response.getPartial()));
        assertEquals(2, response.getAvailable());
        assertEquals(2, response.getRequested());
        verify(questionGenerator, never()).generateContent(anyString());
    }

    @Test
    void testStartSimulationFromQuestionBankPartialDispatchesJob() {
        when(securityService.getAuthenticatedUser()).thenReturn(user);

        Subject subject = Subject.builder().id(100L).subjectName("Direito Constitucional").examPrep(examPrep).build();
        when(subjectRepository.findByIdAndUserId(eq(100L), eq(1L))).thenReturn(Optional.of(subject));

        List<QuestionBankItem> bankItems = List.of(
                QuestionBankItem.builder().id(1L).subject(subject).questionText("Q1").format(QuestionFormat.MULTIPLE_CHOICE_4).correctAlternativeIndex(0).alternatives("[\"A\", \"B\", \"C\", \"D\"]").build()
        );

        when(questionBankService.pickQuestionsForSimulation(eq(100L), eq(5))).thenReturn(bankItems);
        when(questionGenerationJobService.startJob(eq(100L), eq(4), eq(false)))
                .thenReturn(QuestionGenerationJobResponseDTO.builder()
                        .jobId("job-replenish-999")
                        .status(JobStatus.PENDING)
                        .requestedCount(4)
                        .generatedCount(0)
                        .build());

        when(examSimulationRepository.save(any(ExamSimulation.class))).thenAnswer(invocation -> {
            ExamSimulation s = invocation.getArgument(0);
            s.setId(51L);
            return s;
        });
        when(examSimulationRepository.findByIdWithExamPrep(anyLong())).thenAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            return Optional.of(ExamSimulation.builder()
                    .id(id)
                    .examPrep(examPrep)
                    .startTime(LocalDateTime.now())
                    .status(SimulationStatus.STARTED)
                    .contentJson("[]")
                    .build());
        });

        ExamSimulationResponseDTO response = examSimulationService.startSimulation(null, 100L, 5);

        assertNotNull(response);
        assertTrue(Boolean.TRUE.equals(response.getPartial()));
        assertEquals(1, response.getAvailable());
        assertEquals(5, response.getRequested());
        assertEquals("job-replenish-999", response.getGenerationJobId());
        verify(questionGenerationJobService, times(1)).startJob(eq(100L), eq(4), eq(false));
    }
}
