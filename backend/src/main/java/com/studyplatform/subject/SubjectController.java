package com.studyplatform.subject;
import com.studyplatform.shared.exception.ErrorResponseDTO;
import com.studyplatform.subject.SubjectService;
import com.studyplatform.subject.dto.SubjectRequestDTO;
import com.studyplatform.subject.dto.SubjectResponseDTO;
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
@RequestMapping("/api/v1/subjects")
@RequiredArgsConstructor
@Tag(name = "Matérias", description = "Gerenciamento de matérias do usuário autenticado")
public class SubjectController {

    private final SubjectService subjectService;


    @Operation(summary = "Listar matérias", description = "Retorna todas as matérias do usuário autenticado paginadas")
    @ApiResponse(responseCode = "200", description = "Lista retornada com sucesso")
    @GetMapping
    public ResponseEntity<Page<SubjectResponseDTO>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(subjectService.findAll(page, size));
    }

    @Operation(summary = "Buscar matéria por ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Matéria encontrada"),
        @ApiResponse(responseCode = "404", description = "Matéria não encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @GetMapping("/{id}")
    public ResponseEntity<SubjectResponseDTO> findById(
            @Parameter(description = "ID da matéria") @PathVariable Long id) {
        return ResponseEntity.ok(subjectService.findById(id));
    }

    @Operation(summary = "Criar matéria", description = "Cria uma nova matéria para o usuário autenticado")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Matéria criada com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos ou nome duplicado",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @PostMapping
    public ResponseEntity<SubjectResponseDTO> create(
            @RequestBody @Valid SubjectRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(subjectService.create(request));
    }

    @Operation(summary = "Atualizar matéria")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Matéria atualizada com sucesso"),
        @ApiResponse(responseCode = "404", description = "Matéria não encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @PutMapping("/{id}")
    public ResponseEntity<SubjectResponseDTO> update(
            @Parameter(description = "ID da matéria") @PathVariable Long id,
            @RequestBody @Valid SubjectRequestDTO request) {
        return ResponseEntity.ok(subjectService.update(id, request));
    }

    @Operation(summary = "Deletar matéria", description = "Deleta a matéria e todas as suas sessões e metas")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Matéria deletada com sucesso"),
        @ApiResponse(responseCode = "404", description = "Matéria não encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "ID da matéria") @PathVariable Long id) {
        subjectService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
