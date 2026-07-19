package com.studyplatform.flashcard;
import com.studyplatform.flashcard.FlashcardService;
import com.studyplatform.flashcard.dto.FlashcardRequestDTO;
import com.studyplatform.flashcard.dto.FlashcardResponseDTO;
import com.studyplatform.shared.exception.ErrorResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/flashcards")
@RequiredArgsConstructor
@Tag(name = "Cartões de Estudo (Flashcards)", description = "Gerenciamento de cartões de estudo espaçados baseados no Leitner System")
public class FlashcardController {

    private final FlashcardService flashcardService;


    @Operation(summary = "Listar todos os cartões", description = "Retorna todos os cartões de estudo do usuário autenticado paginados")
    @GetMapping
    public ResponseEntity<Page<FlashcardResponseDTO>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(flashcardService.findAll(page, size));
    }

    @Operation(summary = "Listar cartões agendados para revisão", description = "Retorna cartões cuja data de revisão seja menor ou igual à atual")
    @GetMapping("/due")
    public ResponseEntity<List<FlashcardResponseDTO>> findDue() {
        return ResponseEntity.ok(flashcardService.findDue());
    }

    @Operation(summary = "Criar cartão de estudo")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Cartão criado com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class))),
        @ApiResponse(responseCode = "44", description = "Matéria não encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @PostMapping
    public ResponseEntity<FlashcardResponseDTO> create(
            @RequestBody @Valid FlashcardRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(flashcardService.create(request));
    }

    @Operation(summary = "Atualizar cartão de estudo")
    @PutMapping("/{id}")
    public ResponseEntity<FlashcardResponseDTO> update(
            @PathVariable Long id,
            @RequestBody @Valid FlashcardRequestDTO request) {
        return ResponseEntity.ok(flashcardService.update(id, request));
    }

    @Operation(summary = "Registrar revisão do cartão", description = "Atualiza o nível da caixa do cartão e reagenda a próxima revisão com base na qualidade ('easy', 'good', 'hard')")
    @PostMapping("/{id}/review")
    public ResponseEntity<FlashcardResponseDTO> review(
            @PathVariable Long id,
            @RequestParam String quality) {
        return ResponseEntity.ok(flashcardService.review(id, quality));
    }

    @Operation(summary = "Deletar cartão de estudo")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        flashcardService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
