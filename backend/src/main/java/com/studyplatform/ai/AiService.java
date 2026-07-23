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
import com.studyplatform.examprep.ExamPrep;
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
    private final GeminiService geminiService;
    private final com.studyplatform.examprep.ExamPrepRepository examPrepRepository;
    private final com.studyplatform.file.PdfChunkRepository pdfChunkRepository;
    private final AiGeneratedContentRepository aiGeneratedContentRepository;
    private final TtsService ttsService;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    @org.springframework.cache.annotation.Cacheable(
        value = "aiContent",
        key = "T(org.springframework.util.DigestUtils).md5DigestAsHex(#text.getBytes()) + '_' + #subjectId"
    )
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
        if (!geminiService.isConfigured()) {
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

        String response = geminiService.generateContent(prompt);
        return objectMapper.readValue(response, new TypeReference<List<Map<String, String>>>() {});
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

    @Transactional
    public String generatePodcastScript(Long examPrepId, DifficultyLevel difficultyLevel) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepRepository.findByIdAndUserId(examPrepId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Preparação de exame não encontrada"));

        // Verifica se o roteiro de podcast já está gerado no banco de dados
        java.util.Optional<AiGeneratedContent> existing = aiGeneratedContentRepository
                .findByExamPrepIdAndContentTypeAndDifficultyLevel(examPrepId, ContentType.PODCAST_SCRIPT, difficultyLevel);
        if (existing.isPresent()) {
            return existing.get().getContentJson();
        }

        // Caso contrário, busca os trechos do PDF para sintetizar
        List<com.studyplatform.file.PdfChunk> chunks = pdfChunkRepository.findByExamPrepId(examPrepId);
        String textContext = "";
        if (chunks != null && !chunks.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (com.studyplatform.file.PdfChunk chunk : chunks) {
                sb.append(chunk.getChunkText()).append("\n");
                // Limita entrada a 18000 caracteres para evitar estouro de tokens no Gemini Flash
                if (sb.length() > 18000) break;
            }
            textContext = sb.toString();
        } else {
            // Fallback para os nomes das disciplinas cadastradas no exame
            StringBuilder sb = new StringBuilder("Material básico de estudo abrangendo as matérias: ");
            if (examPrep.getSubjects() != null) {
                for (Subject s : examPrep.getSubjects()) {
                    sb.append(s.getSubjectName()).append(", ");
                }
            }
            textContext = sb.toString();
        }

        String scriptText;
        if (!geminiService.isConfigured()) {
            // Fallback local caso a chave não esteja configurada
            scriptText = "Olá estudante! Bem-vindo ao StudyFlow Podcast. " +
                    "Hoje vamos revisar o edital de " + examPrep.getTitle() + " no nível de dificuldade " + difficultyLevel.name() + ". " +
                    "Vamos focar na consolidação dos conceitos principais do seu edital, abrangendo as disciplinas cadastradas e seu material de apoio. " +
                    "Lembre-se: consistência é o pilar mais importante do aprendizado de alta performance. Faça pausas, beba água e revise seus flashcards e quizzes diariamente. Bons estudos no StudyFlow!";
        } else {
            try {
                String prompt = "Você é o host do 'StudyFlow Podcast', um podcast educativo e de altíssima performance para estudantes. " +
                        "Com base nas informações e resumos fornecidos a seguir, elabore um roteiro completo de podcast em português explicando os tópicos de forma leve, coloquial e super didática. " +
                        "O roteiro deve ter uma breve saudação inicial, explicar o conteúdo passo a passo usando exemplos práticos e simples, " +
                        "e encerrar com uma dica rápida de memorização. " +
                        "Nível de profundidade/dificuldade do roteiro: " + difficultyLevel.name() + ". " +
                        "Retorne APENAS o roteiro final de leitura de áudio, sem rubricas, marcas de ator, colchetes ou instruções técnicas de fala.\n\n" +
                        "Conteúdo do edital:\n" + textContext;
                scriptText = geminiService.generateContent(prompt);
            } catch (Exception e) {
                scriptText = "Olá! Bem-vindo ao podcast do StudyFlow. Vamos revisar o edital do exame: " + examPrep.getTitle() + ". " +
                        "Continue revisando seu material e simulados com dedicação diariamente.";
            }
        }

        AiGeneratedContent content = AiGeneratedContent.builder()
                .contentType(ContentType.PODCAST_SCRIPT)
                .difficultyLevel(difficultyLevel)
                .contentJson(scriptText)
                .examPrep(examPrep)
                .build();

        aiGeneratedContentRepository.save(content);
        return scriptText;
    }

    public java.nio.file.Path generatePodcastAudioFile(Long examPrepId, DifficultyLevel difficultyLevel, String scriptText) {
        java.nio.file.Path targetPath = java.nio.file.Paths.get("uploads", "podcasts", "podcast_" + examPrepId + "_" + difficultyLevel.name() + ".mp3")
                .toAbsolutePath().normalize();
        
        // Só gera o arquivo de áudio se ele não existir fisicamente no disco
        if (!java.nio.file.Files.exists(targetPath)) {
            try {
                ttsService.textToSpeech(scriptText, targetPath);
            } catch (IOException e) {
                throw new BusinessException("Falha ao sintetizar o áudio do podcast: " + e.getMessage());
            }
        }
        return targetPath;
    }
}
