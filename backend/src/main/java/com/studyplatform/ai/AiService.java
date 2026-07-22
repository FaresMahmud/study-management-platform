package com.studyplatform.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplatform.ai.dto.AiGeneratedContentResponseDTO;
import com.studyplatform.ai.dto.AiQuizRequest;
import com.studyplatform.ai.dto.AiSummaryRequest;
import com.studyplatform.examprep.ExamPrep;
import com.studyplatform.examprep.ExamPrepRepository;
import com.studyplatform.flashcard.Flashcard;
import com.studyplatform.flashcard.FlashcardMapper;
import com.studyplatform.flashcard.FlashcardRepository;
import com.studyplatform.flashcard.LeitnerBox;
import com.studyplatform.flashcard.dto.FlashcardResponseDTO;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectRepository;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiService {

    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final FlashcardRepository flashcardRepository;
    private final AiGeneratedContentRepository aiGeneratedContentRepository;
    private final ExamPrepRepository examPrepRepository;
    private final FlashcardMapper flashcardMapper;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    @Transactional
    public AiGeneratedContentResponseDTO generateSummary(AiSummaryRequest request) {
        User user = getAuthenticatedUser();
        validatePremiumUser(user);

        if (request.getChunks() == null || request.getChunks().isEmpty()) {
            throw new BusinessException("O conteúdo para geração do resumo não pode ser vazio.");
        }

        ExamPrep examPrep = examPrepRepository.findById(request.getExamPrepId())
            .orElseThrow(() -> new ResourceNotFoundException("Preparatório de exame não encontrado."));

        String fullText = String.join("\n\n", request.getChunks());

        String prompt = "Você é um especialista em criar resumos de estudo concisos e eficazes. " +
            "Com base no texto a seguir, crie um resumo inteligente (smart summary) em português do Brasil. " +
            "O resumo deve capturar os pontos-chave, conceitos e informações mais importantes.\n" +
            "Formate a saída em markdown, usando títulos, listas e negrito para organizar a informação.\n\n" +
            "Texto para analisar:\n" + fullText;

        try {
            String generatedContent = callGeminiApi(prompt);

            AiGeneratedContent summary = AiGeneratedContent.builder()
                .title("Resumo Inteligente sobre " + examPrep.getTitle())
                .content(generatedContent)
                .type(ContentType.SMART_SUMMARY)
                .user(user)
                .examPrep(examPrep)
                .build();

            AiGeneratedContent saved = aiGeneratedContentRepository.save(summary);
            return toResponseDTO(saved);
        } catch (IOException | InterruptedException e) {
            throw new BusinessException("Falha ao se comunicar com a API de IA. Tente novamente mais tarde.");
        }
    }

    @Transactional
    public AiGeneratedContentResponseDTO generateQuiz(AiQuizRequest request) {
        User user = getAuthenticatedUser();
        validatePremiumUser(user);

        if (request.getChunks() == null || request.getChunks().isEmpty()) {
            throw new BusinessException("O conteúdo para geração do quiz não pode ser vazio.");
        }

        ExamPrep examPrep = examPrepRepository.findById(request.getExamPrepId())
            .orElseThrow(() -> new ResourceNotFoundException("Preparatório de exame não encontrado."));

        String fullText = String.join("\n\n", request.getChunks());
        String difficulty = request.getDifficulty() != null ? request.getDifficulty().name() : "médio";

        String prompt = String.format(
            "Você é um especialista em criar quizzes de múltipla escolha. Com base no texto a seguir, " +
                "crie um quiz com 5 a 7 perguntas de nível %s. " +
                "Para cada pergunta, forneça 4 alternativas e indique qual é a correta.\n" +
                "Retorne estritamente um array JSON, sem markdown ou qualquer outra formatação. " +
                "Siga este formato: \n" +
                "[{\"question\":\"Texto da pergunta?\",\"options\":[\"Opção A\",\"Opção B\",\"Opção C\",\"Opção D\"],\"answer\":\"Texto da opção correta\"}]\n\n" +
                "Texto para analisar:\n%s",
            difficulty, fullText
        );

        try {
            String generatedContent = callGeminiApi(prompt);

            AiGeneratedContent quiz = AiGeneratedContent.builder()
                .title("Quiz sobre " + examPrep.getTitle())
                .content(generatedContent)
                .type(ContentType.QUIZ_QUESTIONS)
                .difficulty(request.getDifficulty())
                .user(user)
                .examPrep(examPrep)
                .build();

            AiGeneratedContent saved = aiGeneratedContentRepository.save(quiz);
            return toResponseDTO(saved);
        } catch (IOException | InterruptedException e) {
            throw new BusinessException("Falha ao se comunicar com a API de IA. Tente novamente mais tarde.");
        }
    }

    @Transactional
    public List<FlashcardResponseDTO> generateFlashcards(String text, Long subjectId) {
        User user = getAuthenticatedUser();
        Subject subject = subjectRepository.findByIdAndUserId(subjectId, user.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Matéria não encontrada"));

        validatePremiumUser(user);

        if (text == null || text.trim().isEmpty()) {
            throw new BusinessException("O texto para geração de flashcards não pode ser vazio.");
        }

        if (isMockMode()) {
            return generateMockFlashcards(text, user, subject);
        }

        try {
            List<Map<String, String>> cardsData = callGeminiApiForFlashcards(text);
            List<Flashcard> flashcardsToSave = new ArrayList<>();

            for (Map<String, String> card : cardsData) {
                String front = card.get("front");
                String back = card.get("back");

                if (front != null && back != null) {
                    flashcardsToSave.add(Flashcard.builder()
                        .front(front.trim())
                        .back(back.trim())
                        .box(LeitnerBox.initial())
                        .nextReviewDate(LocalDateTime.now().plusDays(1))
                        .user(user)
                        .subject(subject)
                        .build());
                }
            }
            List<Flashcard> saved = flashcardRepository.saveAll(flashcardsToSave);
            return saved.stream().map(flashcardMapper::toResponseDTO).collect(Collectors.toList());

        } catch (Exception e) {
            return generateMockFlashcards(text, user, subject);
        }
    }

    private List<Map<String, String>> callGeminiApiForFlashcards(String text) throws IOException, InterruptedException {
        String prompt = "Com base no seguinte texto de estudo, crie de 3 a 5 flashcards contendo uma pergunta direta na frente (\"front\") e a resposta curta no verso (\"back\").\n" +
            "Retorne estritamente um array JSON sem formatação markdown, tags ou blocos de código.\n" +
            "Exemplo:\n" +
            "[{\"front\": \"Pergunta?\", \"back\": \"Resposta.\"}]\n" +
            "Texto para analisar:\n" +
            text;

        String rawResponse = callGeminiApi(prompt);
        return objectMapper.readValue(rawResponse, new TypeReference<>() {});
    }

    private String callGeminiApi(String prompt) throws IOException, InterruptedException {
        if (isMockMode()) {
            throw new BusinessException("API Key do Gemini não configurada.");
        }

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            )
        );
        String jsonPayload = objectMapper.writeValueAsString(requestBody);

        HttpClient client = HttpClient.newHttpClient();
        URI uri = URI.create("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(uri)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new BusinessException("Erro na resposta da API Gemini: HTTP " + response.statusCode() + " - " + response.body());
        }

        Map<String, Object> responseMap = objectMapper.readValue(response.body(), new TypeReference<>() {});
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new BusinessException("Nenhum candidato retornado pelo Gemini.");
        }

        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        if (parts == null || parts.isEmpty()) {
            throw new BusinessException("Nenhuma parte de texto retornada pelo Gemini.");
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
    
    private void validatePremiumUser(User user) {
        if (!Boolean.TRUE.equals(user.getPremium())) {
            throw new BusinessException("upgrade_required");
        }
    }

    private boolean isMockMode() {
        return geminiApiKey == null || geminiApiKey.trim().isEmpty() || geminiApiKey.equals("SUA_CHAVE_GEMINI_AQUI");
    }

    private List<FlashcardResponseDTO> generateMockFlashcards(String text, User user, Subject subject) {
        List<FlashcardResponseDTO> mockCards = new ArrayList<>();
        String[] sentences = text.split("[.!?\n]+");

        int count = 0;
        for (String sentence : sentences) {
            sentence = sentence.trim();
            if (sentence.length() < 25) continue;

            String front = null;
            String back = null;

            if (sentence.toLowerCase().contains(" é ") || sentence.toLowerCase().contains(" significa ")) {
                String[] parts = sentence.split("(?i) é | significa ", 2);
                front = "O que é " + parts[0].trim() + "?";
                back = parts[0].trim() + " é " + parts[1].trim();
            } else if (sentence.toLowerCase().contains(" serve para ")) {
                String[] parts = sentence.split("(?i) serve para ", 2);
                front = "Para que serve " + parts[0].trim() + "?";
                back = "Serve para " + parts[1].trim();
            }

            if (front != null && back != null) {
                Flashcard flashcard = Flashcard.builder()
                    .front(front)
                    .back(back)
                    .box(LeitnerBox.initial())
                    .nextReviewDate(LocalDateTime.now().plusDays(1))
                    .user(user)
                    .subject(subject)
                    .build();

                Flashcard saved = flashcardRepository.save(flashcard);
                mockCards.add(flashcardMapper.toResponseDTO(saved));
                count++;
            }

            if (count >= 3) break;
        }

        if (mockCards.isEmpty()) {
            String titlePreview = text.substring(0, Math.min(25, text.length())) + "...";
            Flashcard flashcard = Flashcard.builder()
                .front("Qual é o ponto central do texto: \"" + titlePreview + "\"?")
                .back("Resposta de estudo ativo com base no texto completo: " + text)
                .box(LeitnerBox.initial())
                .nextReviewDate(LocalDateTime.now().plusDays(1))
                .user(user)
                .subject(subject)
                .build();

            Flashcard saved = flashcardRepository.save(flashcard);
            mockCards.add(flashcardMapper.toResponseDTO(saved));
        }

        return mockCards;
    }

    private AiGeneratedContentResponseDTO toResponseDTO(AiGeneratedContent content) {
        return AiGeneratedContentResponseDTO.builder()
            .id(content.getId())
            .title(content.getTitle())
            .content(content.getContent())
            .type(content.getType())
            .difficulty(content.getDifficulty())
            .creationDate(content.getCreationDate())
            .userId(content.getUser().getId())
            .examPrepId(content.getExamPrep().getId())
            .build();
    }
}
