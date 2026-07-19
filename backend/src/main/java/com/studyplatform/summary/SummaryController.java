package com.studyplatform.summary;
import com.studyplatform.shared.exception.ErrorResponseDTO;
import com.studyplatform.summary.SummaryService;
import com.studyplatform.summary.dto.SummaryRequestDTO;
import com.studyplatform.summary.dto.SummaryResponseDTO;
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
@RequestMapping("/api/v1/summaries")
@RequiredArgsConstructor
@Tag(name = "Resumos de Estudo", description = "Gerenciamento de resumos de estudo ricos (estilo Notion)")
public class SummaryController {

    private final SummaryService summaryService;


    @Operation(summary = "Listar todos os resumos", description = "Retorna todos os resumos do usuário autenticado paginados")
    @GetMapping
    public ResponseEntity<Page<SummaryResponseDTO>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(summaryService.findAll(page, size));
    }

    @Operation(summary = "Buscar resumo por ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Resumo encontrado"),
        @ApiResponse(responseCode = "404", description = "Resumo não encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @GetMapping("/{id}")
    public ResponseEntity<SummaryResponseDTO> findById(
            @Parameter(description = "ID do resumo") @PathVariable Long id) {
        return ResponseEntity.ok(summaryService.findById(id));
    }

    @Operation(summary = "Listar resumos por matéria")
    @GetMapping("/subject/{subjectId}")
    public ResponseEntity<List<SummaryResponseDTO>> findBySubjectId(
            @Parameter(description = "ID da matéria") @PathVariable Long subjectId) {
        return ResponseEntity.ok(summaryService.findBySubjectId(subjectId));
    }

    @Operation(summary = "Criar resumo", description = "Registra um novo resumo rico vinculado a uma matéria")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Resumo criado com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class))),
        @ApiResponse(responseCode = "404", description = "Matéria não encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @PostMapping
    public ResponseEntity<SummaryResponseDTO> create(
            @RequestBody @Valid SummaryRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(summaryService.create(request));
    }

    @Operation(summary = "Atualizar resumo")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Resumo atualizado com sucesso"),
        @ApiResponse(responseCode = "404", description = "Resumo ou matéria não encontrados",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @PutMapping("/{id}")
    public ResponseEntity<SummaryResponseDTO> update(
            @Parameter(description = "ID do resumo") @PathVariable Long id,
            @RequestBody @Valid SummaryRequestDTO request) {
        return ResponseEntity.ok(summaryService.update(id, request));
    }

    @Operation(summary = "Deletar resumo")
    @ApiResponse(responseCode = "204", description = "Resumo deletado com sucesso")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "ID do resumo") @PathVariable Long id) {
        summaryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
