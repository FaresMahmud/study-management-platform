package com.studyplatform.controller;

import com.studyplatform.dto.request.GoalRequestDTO;
import com.studyplatform.dto.response.GoalResponseDTO;
import com.studyplatform.exception.ErrorResponseDTO;
import com.studyplatform.service.GoalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
@Tag(name = "Metas", description = "Gerenciamento de metas de estudo")
public class GoalController {

    private final GoalService goalService;

    @Operation(summary = "Listar metas", description = "Retorna todas as metas do usuário autenticado")
    @GetMapping
    public ResponseEntity<List<GoalResponseDTO>> findAll() {
        return ResponseEntity.ok(goalService.findAll());
    }

    @Operation(summary = "Buscar meta por ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Meta encontrada"),
        @ApiResponse(responseCode = "404", description = "Meta não encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @GetMapping("/{id}")
    public ResponseEntity<GoalResponseDTO> findById(
            @Parameter(description = "ID da meta") @PathVariable Long id) {
        return ResponseEntity.ok(goalService.findById(id));
    }

    @Operation(summary = "Criar meta", description = "Cria uma nova meta. O subjectId é opcional.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Meta criada com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos ou datas inconsistentes",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @PostMapping
    public ResponseEntity<GoalResponseDTO> create(
            @RequestBody @Valid GoalRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(goalService.create(request));
    }

    @Operation(summary = "Atualizar meta")
    @PutMapping("/{id}")
    public ResponseEntity<GoalResponseDTO> update(
            @Parameter(description = "ID da meta") @PathVariable Long id,
            @RequestBody @Valid GoalRequestDTO request) {
        return ResponseEntity.ok(goalService.update(id, request));
    }

    @Operation(summary = "Deletar meta")
    @ApiResponse(responseCode = "204", description = "Meta deletada com sucesso")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "ID da meta") @PathVariable Long id) {
        goalService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
