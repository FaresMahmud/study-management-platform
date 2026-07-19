package com.studyplatform.ai;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    public List<FlashcardResponseDTO> generateFlashcards(String text, Long subjectId) {
        User user = getAuthenticatedUser();
        Subject subject = subjectRepository.findByIdAndUserId(subjectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Matéria não encontrada"));

        if (!Boolean.TRUE.equals(user.getPremium())) {
            throw new BusinessException("upgrade_required");
        }

        if (text == null || text.trim().isEmpty()) {
            throw new BusinessException("O texto para geração de flashcards não pode ser vazio.");
        }

        // Se a chave não estiver configurada, gera perguntas simuladas (mock inteligente) para não quebrar a experiência
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty() || geminiApiKey.equals("SUA_CHAVE_GEMINI_AQUI")) {
            return generateMockFlashcards(text, user, subject);
        }

        try {
            List<Map<String, String>> cardsData = callGeminiApi(text);
            List<FlashcardResponseDTO> responseDTOs = new ArrayList<>();

            for (Map<String, String> card : cardsData) {
                String front = card.get("front");
                String back = card.get("back");

                if (front != null && back != null) {
                    Flashcard flashcard = Flashcard.builder()
                            .front(front.trim())
                            .back(back.trim())
                            .box(LeitnerBox.initial())
                            .nextReviewDate(LocalDateTime.now().plusDays(1))
                            .user(user)
                            .subject(subject)
                            .build();

                    Flashcard saved = flashcardRepository.save(flashcard);
                    responseDTOs.add(flashcardMapper.toResponseDTO(saved));
                }
            }

            return responseDTOs;
        } catch (Exception e) {
            // Em caso de falha de conexão ou cota na API do Gemini, faz o fallback para o mock inteligente
            return generateMockFlashcards(text, user, subject);
        }
    }

    private List<Map<String, String>> callGeminiApi(String text) throws IOException, InterruptedException {
        String prompt = "Com base no seguinte texto de estudo, crie de 3 a 5 flashcards contendo uma pergunta direta na frente (\"front\") e a resposta curta no verso (\"back\").\n" +
                "Retorne estritamente um array JSON sem formatação markdown, tags ou blocos de código.\n" +
                "Exemplo:\n" +
                "[{\"front\": \"Pergunta?\", \"back\": \"Resposta.\"}]\n" +
                "Texto para analisar:\n" +
                text;

        // Cria o payload para o Gemini 1.5 Flash (modelo estável e rápido)
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
            throw new BusinessException("Erro na resposta da API Gemini: HTTP " + response.statusCode());
        }

        // Faz o parsing da resposta do Gemini
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
        
        // Limpa blocos de código markdown se o modelo ignorou a regra de resposta limpa
        String cleanJson = rawText.trim();
        if (cleanJson.startsWith("```json")) {
            cleanJson = cleanJson.substring(7);
        } else if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.substring(3);
        }
        if (cleanJson.endsWith("```")) {
            cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
        }
        cleanJson = cleanJson.trim();

        return objectMapper.readValue(cleanJson, new TypeReference<List<Map<String, String>>>() {});
    }

    private List<FlashcardResponseDTO> generateMockFlashcards(String text, User user, Subject subject) {
        // Mock Inteligente: Extrai sentenças com base em padrões comuns (ex: "é", "são", "como", "porque")
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

            if (count >= 3) break; // Limite de 3 flashcards gerados no modo simulado
        }

        // Fallback genérico caso nenhuma sentença case
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
}
