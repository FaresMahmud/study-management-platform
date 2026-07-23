package com.studyplatform.examprep.simulation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplatform.ai.AiGeneratedContent;
import com.studyplatform.ai.AiGeneratedContentRepository;
import com.studyplatform.ai.ContentType;
import com.studyplatform.ai.DifficultyLevel;
import com.studyplatform.examprep.ExamPrep;
import com.studyplatform.examprep.ExamPrepRepository;
import com.studyplatform.examprep.simulation.dto.ExamSimulationResponse;
import com.studyplatform.examprep.simulation.dto.ExamSimulationStartRequest;
import com.studyplatform.file.FileAnnotation;
import com.studyplatform.file.FileAnnotationRepository;
import com.studyplatform.file.UploadedFile;
import com.studyplatform.file.UploadedFileRepository;
import com.studyplatform.quiz.dto.QuizAnswerRequest;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExamSimulationService {

    private final ExamSimulationRepository examSimulationRepository;
    private final ExamPrepRepository examPrepRepository;
    private final UserRepository userRepository;
    private final UploadedFileRepository uploadedFileRepository;
    private final FileAnnotationRepository fileAnnotationRepository;
    private final AiGeneratedContentRepository aiGeneratedContentRepository;
    private final ExamSimulationMapper examSimulationMapper;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    @Transactional
    public ExamSimulationResponse startSimulation(ExamSimulationStartRequest request) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepRepository.findByIdAndUserId(request.getExamPrepId(), user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Preparatório de exame não encontrado."));

        // Buscar ou gerar as questões do simulado
        AiGeneratedContent simulationQuestions = getOrGenerateSimulationQuestions(examPrep, user);

        ExamSimulation simulation = ExamSimulation.builder()
                .title("Simulado para " + examPrep.getTitle())
                .startTime(LocalDateTime.now())
                .user(user)
                .examPrep(examPrep)
                .build();

        ExamSimulation savedSimulation = examSimulationRepository.save(simulation);

        List<Map<String, Object>> parsedQuestions = parseQuestionsJson(simulationQuestions.getContent());

        return examSimulationMapper.toResponseDTO(savedSimulation, simulationQuestions.getId(), parsedQuestions);
    }

    @Transactional
    public ExamSimulationResponse finishSimulation(Long simulationId, List<QuizAnswerRequest> answers) {
        User user = getAuthenticatedUser();
        ExamSimulation simulation = examSimulationRepository.findById(simulationId)
                .orElseThrow(() -> new ResourceNotFoundException("Simulado não encontrado."));

        if (!simulation.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Você não tem permissão para acessar este simulado.");
        }

        if (simulation.getEndTime() != null) {
            throw new BusinessException("Este simulado já foi finalizado.");
        }

        LocalDateTime endTime = LocalDateTime.now();
        simulation.setEndTime(endTime);

        long secondsElapsed = Duration.between(simulation.getStartTime(), endTime).getSeconds();
        // 15 minutos = 900 segundos. Tolerância extra de 60 segundos por latência de rede (960 segundos no total).
        boolean timedOut = secondsElapsed > 960;

        // Buscar questões do simulado
        List<AiGeneratedContent> generatedContents = aiGeneratedContentRepository.findByExamPrep_Id(simulation.getExamPrep().getId());
        AiGeneratedContent simulationQuestions = generatedContents.stream()
                .filter(content -> content.getType() == ContentType.SIMULATION_QUESTIONS)
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Questões do simulado não encontradas."));

        List<Map<String, Object>> questionsList = parseQuestionsJson(simulationQuestions.getContent());

        double finalScore = 0.0;

        if (timedOut) {
            log.warn("Simulado {} do usuário {} finalizado após o tempo limite de 15 minutos (levou {}s). Pontuação definida como 0.", 
                    simulationId, user.getId(), secondsElapsed);
        } else {
            int totalQuestions = questionsList.size();
            int correctCount = 0;

            for (QuizAnswerRequest answerReq : answers) {
                int qNum = answerReq.getQuestionNumber();
                if (qNum >= 0 && qNum < totalQuestions) {
                    Map<String, Object> questionMap = questionsList.get(qNum);
                    List<String> options = (List<String>) questionMap.get("options");
                    String correctAnswerText = (String) questionMap.get("answer");

                    Integer selectedIdx = answerReq.getSelectedOption();
                    if (selectedIdx >= 0 && selectedIdx < options.size()) {
                        String selectedText = options.get(selectedIdx);
                        if (selectedText.trim().equalsIgnoreCase(correctAnswerText.trim())) {
                            correctCount++;
                        }
                    }
                }
            }

            finalScore = totalQuestions > 0 ? ((double) correctCount / totalQuestions) * 100.0 : 0.0;
        }

        simulation.setScore(finalScore);
        ExamSimulation saved = examSimulationRepository.save(simulation);

        // Disparar o recálculo do domínio (mock/log de acordo com regras de negócio)
        recalculateDomain(user, simulation.getExamPrep(), finalScore);

        return examSimulationMapper.toResponseDTO(saved, simulationQuestions.getId(), questionsList);
    }

    private void recalculateDomain(User user, ExamPrep examPrep, Double simulationScore) {
        // Encontra o histórico de simulados finalizados deste preparatório
        List<ExamSimulation> simulations = examSimulationRepository.findByExamPrepId(examPrep.getId()).stream()
                .filter(sim -> sim.getEndTime() != null && sim.getScore() != null)
                .collect(Collectors.toList());

        double totalScore = simulations.stream().mapToDouble(ExamSimulation::getScore).sum();
        double averageScore = simulations.isEmpty() ? 0.0 : totalScore / simulations.size();

        log.info("### RECÁLCULO DO DOMÍNIO ### Usuário: {} | Preparatório: {} | Pontuação Simulado Atual: {} | Média de Domínio Atualizada: {}%",
                user.getEmail(), examPrep.getTitle(), simulationScore, String.format("%.2f", averageScore));
    }

    private AiGeneratedContent getOrGenerateSimulationQuestions(ExamPrep examPrep, User user) {
        List<AiGeneratedContent> existing = aiGeneratedContentRepository.findByExamPrep_Id(examPrep.getId());
        
        // Retornar existente se houver
        for (AiGeneratedContent content : existing) {
            if (content.getType() == ContentType.SIMULATION_QUESTIONS) {
                return content;
            }
        }

        // Caso contrário, gerar novo via Gemini
        List<UploadedFile> files = uploadedFileRepository.findByUserIdAndSubjectId(user.getId(), examPrep.getSubject().getId());
        List<String> chunks = files.stream()
                .flatMap(file -> fileAnnotationRepository.findByUploadedFileId(file.getId()).stream())
                .map(FileAnnotation::getContent)
                .collect(Collectors.toList());

        String generatedContent;
        if (chunks.isEmpty() || isMockMode()) {
            generatedContent = generateMockQuestionsJson();
        } else {
            String fullText = String.join("\n\n", chunks);
            String prompt = "Você é um especialista em criar simulados cronometrados de alta qualidade. " +
                    "Com base no texto a seguir, crie um simulado de múltipla escolha com 10 perguntas abrangentes.\n" +
                    "Para cada pergunta, forneça 4 alternativas e indique qual é a correta.\n" +
                    "Retorne estritamente um array JSON sem markdown ou formatação extra. " +
                    "Siga exatamente este formato:\n" +
                    "[{\"question\":\"Texto da pergunta?\",\"options\":[\"Opção A\",\"Opção B\",\"Opção C\",\"Opção D\"],\"answer\":\"Texto da opção correta\"}]\n\n" +
                    "Texto para analisar:\n" + fullText;

            try {
                generatedContent = callGeminiApi(prompt);
            } catch (Exception e) {
                log.error("Erro ao chamar API do Gemini para gerar simulado. Usando mock.", e);
                generatedContent = generateMockQuestionsJson();
            }
        }

        AiGeneratedContent simulationQuestions = AiGeneratedContent.builder()
                .title("Simulado - " + examPrep.getTitle())
                .content(generatedContent)
                .type(ContentType.SIMULATION_QUESTIONS)
                .difficulty(DifficultyLevel.MEDIUM)
                .user(user)
                .examPrep(examPrep)
                .build();

        return aiGeneratedContentRepository.save(simulationQuestions);
    }

    private String callGeminiApi(String prompt) throws IOException, InterruptedException {
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                )
        );
        String jsonPayload = objectMapper.writeValueAsString(requestBody);

        URI uri = URI.create("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new BusinessException("Erro na resposta da API Gemini: HTTP " + response.statusCode());
        }

        Map<String, Object> responseMap = objectMapper.readValue(response.body(), new TypeReference<>() {});
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new BusinessException("Nenhum candidato retornado pelo Gemini.");
        }

        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        if (parts == null || parts.isEmpty()) {
            throw new BusinessException("Nenhuma parte retornada.");
        }

        String rawText = (String) parts.get(0).get("text");
        return cleanJsonMarkdown(rawText);
    }

    private String cleanJsonMarkdown(String rawText) {
        String cleanJson = rawText.trim();
        if (cleanJson.startsWith("```json")) {
            cleanJson = cleanJson.substring(7);
        } else if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.substring(3);
        }
        if (cleanJson.endsWith("```")) {
            cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
        }
        return cleanJson.trim();
    }

    private List<Map<String, Object>> parseQuestionsJson(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.error("Erro ao fazer parse do JSON de perguntas", e);
            return List.of();
        }
    }

    private boolean isMockMode() {
        return geminiApiKey == null || geminiApiKey.trim().isEmpty() || geminiApiKey.equals("SUA_CHAVE_GEMINI_AQUI");
    }

    private String generateMockQuestionsJson() {
        return "[" +
                "{\"question\":\"Questão 1 de Simulação do Gemini?\",\"options\":[\"Opção A\",\"Opção B\",\"Opção C\",\"Opção D\"],\"answer\":\"Opção A\"}," +
                "{\"question\":\"Questão 2 de Simulação do Gemini?\",\"options\":[\"Opção A\",\"Opção B\",\"Opção C\",\"Opção D\"],\"answer\":\"Opção B\"}," +
                "{\"question\":\"Questão 3 de Simulação do Gemini?\",\"options\":[\"Opção A\",\"Opção B\",\"Opção C\",\"Opção D\"],\"answer\":\"Opção C\"}" +
                "]";
    }
}
