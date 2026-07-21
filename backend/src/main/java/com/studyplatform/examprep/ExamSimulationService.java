package com.studyplatform.examprep;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplatform.ai.GeminiService;
import com.studyplatform.file.PdfChunk;
import com.studyplatform.file.PdfChunkRepository;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Serviço responsável por gerenciar simulações de exame cronometradas (Simulados).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExamSimulationService {

    private final ExamSimulationRepository examSimulationRepository;
    private final ExamPrepRepository examPrepRepository;
    private final PdfChunkRepository pdfChunkRepository;
    private final UserRepository userRepository;
    private final GeminiService geminiService;
    private final QuizAttemptService quizAttemptService;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    /**
     * Inicia uma simulação cronometrada de 15 minutos com 3 questões pré-geradas por IA.
     */
    @Transactional
    public ExamSimulation startSimulation(Long examPrepId) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepRepository.findByIdAndUserId(examPrepId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Preparação de prova não encontrada"));

        // Busca o contexto de estudos correspondente
        List<PdfChunk> chunks = pdfChunkRepository.findByExamPrepId(examPrepId);
        String contextText = chunks.stream()
                .limit(5) // Limitado a 5 blocos para não estourar contexto do prompt em dev
                .map(PdfChunk::getChunkText)
                .collect(Collectors.joining("\n\n"));

        String questionsJson;
        if (!geminiService.isConfigured() || contextText.trim().isEmpty()) {
            questionsJson = generateMockSimulationQuestions();
        } else {
            try {
                String prompt = "Você é o gerador de simulados do StudyFlow. " +
                        "Baseando-se no seguinte contexto de estudos em PDF, crie 3 questões de múltipla escolha difíceis para uma simulação cronometrada (sem auxílio). " +
                        "Cada questão deve ter um enunciado, 4 opções de resposta (A, B, C, D) e indicar qual é a alternativa correta (A, B, C ou D).\n\n" +
                        "Contexto de Estudos:\n" +
                        contextText + "\n\n" +
                        "Retorne estritamente um array JSON sem formatação markdown (sem ```json), contendo o seguinte formato exata:\n" +
                        "[\n" +
                        "  {\n" +
                        "    \"question\": \"Enunciado da questão\",\n" +
                        "    \"options\": {\n" +
                        "      \"A\": \"Alternativa A\",\n" +
                        "      \"B\": \"Alternativa B\",\n" +
                        "      \"C\": \"Alternativa C\",\n" +
                        "      \"D\": \"Alternativa D\"\n" +
                        "    },\n" +
                        "    \"correctAnswer\": \"A\"\n" +
                        "  }\n" +
                        "]";

                questionsJson = geminiService.generateContent(prompt);
            } catch (Exception e) {
                log.error("Falha ao obter questões do Gemini. Utilizando fallback local.", e);
                questionsJson = generateMockSimulationQuestions();
            }
        }

        ExamSimulation simulation = ExamSimulation.builder()
                .examPrep(examPrep)
                .startTime(LocalDateTime.now())
                .status(SimulationStatus.STARTED)
                .contentJson(questionsJson)
                .build();

        return examSimulationRepository.save(simulation);
    }

    /**
     * Finaliza a simulação e calcula o resultado da prova cronometrada de 15 minutos.
     */
    @Transactional
    public ExamSimulation finishSimulation(Long simulationId, Map<Integer, String> answers) {
        User user = getAuthenticatedUser();
        ExamSimulation simulation = examSimulationRepository.findByIdAndExamPrepUserId(simulationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Simulado não encontrado"));

        if (simulation.getStatus() != SimulationStatus.STARTED) {
            throw new BusinessException("Este simulado já foi finalizado ou cancelado.");
        }

        LocalDateTime now = LocalDateTime.now();
        // Verifica se estourou os 15 minutos cronometrados (+30 segundos de tolerância de rede/latência)
        boolean isTimedOut = now.isAfter(simulation.getStartTime().plusMinutes(15).plusSeconds(30));
        SimulationStatus finalStatus = isTimedOut ? SimulationStatus.TIMED_OUT : SimulationStatus.COMPLETED;

        int correctCount = 0;
        try {
            List<Map<String, Object>> questions = objectMapper.readValue(
                    simulation.getContentJson(),
                    new TypeReference<>() {}
            );

            for (int i = 0; i < questions.size(); i++) {
                Map<String, Object> question = questions.get(i);
                String correctAnswer = (String) question.get("correctAnswer");
                String studentAnswer = answers.get(i); // Índice da resposta do aluno

                if (correctAnswer != null && correctAnswer.equalsIgnoreCase(studentAnswer)) {
                    correctCount++;
                }
            }
        } catch (Exception e) {
            log.error("Falha ao analisar JSON das questões no encerramento do simulado ID: {}", simulationId, e);
        }

        int score = (int) Math.round((double) correctCount / 3.0 * 100);

        simulation.setEndTime(now);
        simulation.setScore(score);
        simulation.setStatus(finalStatus);

        ExamSimulation saved = examSimulationRepository.save(simulation);
        log.info("Simulado ID: {} finalizado com status: {} e Score: {}", simulationId, finalStatus, score);

        // Publica evento para recálculo de maestria assíncrono
        eventPublisher.publishEvent(new ExamPrepActivityEvent(this, simulation.getExamPrep().getId()));

        return saved;
    }

    private String generateMockSimulationQuestions() {
        return "[\n" +
                "  {\n" +
                "    \"question\": \"Qual das seguintes opções descreve corretamente o RAG (Retrieval-Augmented Generation)?\",\n" +
                "    \"options\": {\n" +
                "      \"A\": \"Uma técnica de otimização de consultas SQL relacionais baseadas em hash de chave primária.\",\n" +
                "      \"B\": \"Uma abordagem híbrida que combina modelos de linguagem com recuperação externa de documentos semânticos.\",\n" +
                "      \"C\": \"Um algoritmo de encriptação assimétrica utilizado no tráfego seguro de tokens JWT.\",\n" +
                "      \"D\": \"Uma estratégia física de mapeamento camelCase no Hibernate ORM.\"\n" +
                "    },\n" +
                "    \"correctAnswer\": \"B\"\n" +
                "  },\n" +
                "  {\n" +
                "    \"question\": \"O que é o banco de dados vetorial ChromaDB?\",\n" +
                "    \"options\": {\n" +
                "      \"A\": \"Um sistema in-memory utilizado exclusivamente para gerenciar as caixas do método Leitner de repetição espaçada.\",\n" +
                "      \"B\": \"Um banco de dados projetado para armazenar, gerenciar e pesquisar embeddings vetoriais com alta eficiência.\",\n" +
                "      \"C\": \"Um driver JDBC nativo do Spring Boot para gerenciar conexões HikariPool.\",\n" +
                "      \"D\": \"Uma engine de renderização de visualizadores de PDF no frontend React.\"\n" +
                "    },\n" +
                "    \"correctAnswer\": \"B\"\n" +
                "  },\n" +
                "  {\n" +
                "    \"question\": \"Qual é a finalidade principal do cabeçalho X-Trace-Id implementado no StudyFlow?\",\n" +
                "    \"options\": {\n" +
                "      \"A\": \"Proteger o aplicativo contra ataques de injeção Cross-Site Scripting (XSS).\",\n" +
                "      \"B\": \"Identificar unicamente uma requisição HTTP de ponta a ponta para depuração e observabilidade estruturada.\",\n" +
                "      \"C\": \"Calcular a média ponderada de maestria (current_mastery) associada às metas de estudo.\",\n" +
                "      \"D\": \"Autenticar tokens JWT expirados nas rotas do monólito Spring Boot.\"\n" +
                "    },\n" +
                "    \"correctAnswer\": \"B\"\n" +
                "  }\n" +
                "]";
    }
}
