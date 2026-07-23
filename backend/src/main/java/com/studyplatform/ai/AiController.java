package com.studyplatform.ai;
import com.studyplatform.ai.AiService;
import com.studyplatform.flashcard.dto.FlashcardResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Tag(name = "Inteligência Artificial (Gemini)", description = "Serviços cognitivos automatizados com Inteligência Artificial")
public class AiController {

    private final AiService aiService;

    @Operation(summary = "Gerar flashcards a partir de um texto de estudo", description = "Lê o texto do resumo e gera de 3 a 5 cartões Leitner automaticamente")
    @PostMapping("/generate-flashcards")
    public ResponseEntity<List<FlashcardResponseDTO>> generateFlashcards(@RequestBody GenerationRequest request) {
        List<FlashcardResponseDTO> cards = aiService.generateFlashcards(request.getText(), request.getSubjectId());
        return ResponseEntity.ok(cards);
    }

    @Operation(summary = "Gerar roteiro de podcast e áudio sintetizado", description = "Gera o script explicativo via Gemini e sintetiza para áudio MP3")
    @PostMapping("/podcast/generate")
    public ResponseEntity<java.util.Map<String, Object>> generatePodcast(@RequestBody PodcastRequest request) {
        String script = aiService.generatePodcastScript(request.getExamPrepId(), request.getDifficultyLevel());
        aiService.generatePodcastAudioFile(request.getExamPrepId(), request.getDifficultyLevel(), script);
        
        String playUrl = "/api/v1/ai/podcast/stream/" + request.getExamPrepId() + "/" + request.getDifficultyLevel().name();
        
        return ResponseEntity.ok(java.util.Map.of(
            "examPrepId", request.getExamPrepId(),
            "difficultyLevel", request.getDifficultyLevel().name(),
            "scriptText", script,
            "playUrl", playUrl
        ));
    }

    @Operation(summary = "Transmitir arquivo de áudio do podcast", description = "Retorna o fluxo binário do áudio MP3 gerado para reprodução no player HTML5")
    @org.springframework.web.bind.annotation.GetMapping("/podcast/stream/{examPrepId}/{difficultyLevel}")
    public ResponseEntity<org.springframework.core.io.Resource> streamPodcast(
            @org.springframework.web.bind.annotation.PathVariable Long examPrepId,
            @org.springframework.web.bind.annotation.PathVariable DifficultyLevel difficultyLevel) {
        try {
            String script = aiService.generatePodcastScript(examPrepId, difficultyLevel);
            java.nio.file.Path audioPath = aiService.generatePodcastAudioFile(examPrepId, difficultyLevel, script);
            
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(audioPath.toUri());
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType("audio/mpeg"))
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + audioPath.getFileName().toString() + "\"")
                    .body(resource);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Erro ao transmitir áudio", e);
        }
    }

    @Data
    public static class GenerationRequest {
        private String text;
        private Long subjectId;
    }

    @Data
    public static class PodcastRequest {
        private Long examPrepId;
        private DifficultyLevel difficultyLevel;
    }
}
