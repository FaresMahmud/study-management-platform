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

    @Data
    public static class GenerationRequest {
        private String text;
        private Long subjectId;
    }
}
