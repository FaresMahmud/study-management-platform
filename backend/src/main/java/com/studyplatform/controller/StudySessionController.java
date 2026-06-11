package com.studyplatform.controller;

import com.studyplatform.dto.request.StudySessionRequestDTO;
import com.studyplatform.dto.response.StudySessionResponseDTO;
import com.studyplatform.exception.ErrorResponseDTO;
import com.studyplatform.service.StudySessionService;
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
@RequestMapping("/api/study-sessions")
@RequiredArgsConstructor
@Tag(name = "Sessões de Estudo", description = "Gerenciamento de sessões de estudo")
public class StudySessionController {

    private final StudySessionService studySessionService;

    @Operation(summary = "Listar sessões", description = "Retorna todas as sessões do usuário autenticado")
    @GetMapping
    public ResponseEntity<List<StudySessionResponseDTO>> findAll() {
        return ResponseEntity.ok(studySessionService.findAll());
    }

    @Operation(summary = "Buscar sessão por ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Sessão encontrada"),
        @ApiResponse(responseCode = "404", description = "Sessão não encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @GetMapping("/{id}")
    public ResponseEntity<StudySessionResponseDTO> findById(
            @Parameter(description = "ID da sessão") @PathVariable Long id) {
        return ResponseEntity.ok(studySessionService.findById(id));
    }

    @Operation(summary = "Registrar sessão", description = "Registra uma nova sessão de estudo vinculada a uma matéria")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Sessão criada com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class))),
        @ApiResponse(responseCode = "404", description = "Matéria não encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponseDTO.class)))
    })
    @PostMapping
    public ResponseEntity<StudySessionResponseDTO> create(
            @RequestBody @Valid StudySessionRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studySessionService.create(request));
    }

    @Operation(summary = "Atualizar sessão")
    @PutMapping("/{id}")
    public ResponseEntity<StudySessionResponseDTO> update(
            @Parameter(description = "ID da sessão") @PathVariable Long id,
            @RequestBody @Valid StudySessionRequestDTO request) {
        return ResponseEntity.ok(studySessionService.update(id, request));
    }

    @Operation(summary = "Deletar sessão")
    @ApiResponse(responseCode = "204", description = "Sessão deletada com sucesso")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "ID da sessão") @PathVariable Long id) {
        studySessionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
