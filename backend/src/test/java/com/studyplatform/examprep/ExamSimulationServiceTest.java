package com.studyplatform.examprep;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplatform.ai.GeminiService;
import com.studyplatform.file.PdfChunkRepository;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Collections;
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
    private PdfChunkRepository pdfChunkRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GeminiService geminiService;

    @Mock
    private QuizAttemptService quizAttemptService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ExamSimulationService examSimulationService;

    private User user;
    private ExamPrep examPrep;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).email("student@studyflow.com").build();
        examPrep = ExamPrep.builder().id(1L).user(user).build();

        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void testStartSimulationOfflineFallback() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("student@studyflow.com");
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));
        when(examPrepRepository.findByIdAndUserId(eq(1L), eq(1L))).thenReturn(Optional.of(examPrep));
        when(pdfChunkRepository.findByExamPrepId(eq(1L))).thenReturn(Collections.emptyList());

        when(examSimulationRepository.save(any(ExamSimulation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExamSimulation result = examSimulationService.startSimulation(1L);

        assertNotNull(result);
        assertEquals(SimulationStatus.STARTED, result.getStatus());
        assertTrue(result.getContentJson().contains("Qual das seguintes opções descreve corretamente o RAG"));
        verify(examSimulationRepository, times(1)).save(any(ExamSimulation.class));
    }

    @Test
    void testFinishSimulationSuccess() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("student@studyflow.com");
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));

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

        Map<Integer, String> studentAnswers = Map.of(
                0, "A", // Correct
                1, "B", // Correct
                2, "A"  // Incorrect
        );

        ExamSimulation result = examSimulationService.finishSimulation(10L, studentAnswers);

        assertNotNull(result);
        assertEquals(SimulationStatus.COMPLETED, result.getStatus());
        assertEquals(67, result.getScore());
        verify(eventPublisher, times(1)).publishEvent(any(ExamPrepActivityEvent.class));
    }

    @Test
    void testFinishSimulationTimeout() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("student@studyflow.com");
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));

        String contentJson = "[]";

        // Início há 16 minutos (estourou o tempo de 15 minutos)
        ExamSimulation simulation = ExamSimulation.builder()
                .id(10L)
                .examPrep(examPrep)
                .startTime(LocalDateTime.now().minusMinutes(16))
                .status(SimulationStatus.STARTED)
                .contentJson(contentJson)
                .build();

        when(examSimulationRepository.findByIdAndExamPrepUserId(eq(10L), eq(1L))).thenReturn(Optional.of(simulation));
        when(examSimulationRepository.save(any(ExamSimulation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExamSimulation result = examSimulationService.finishSimulation(10L, Map.of());

        assertNotNull(result);
        assertEquals(SimulationStatus.TIMED_OUT, result.getStatus());
    }

    @Test
    void testFinishSimulationAlreadyFinished() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("student@studyflow.com");
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));

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
