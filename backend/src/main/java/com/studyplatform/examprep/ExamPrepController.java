package com.studyplatform.examprep;

import com.studyplatform.examprep.dto.ExamPrepRequestDTO;
import com.studyplatform.examprep.dto.ExamPrepResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/exam-preps")
@RequiredArgsConstructor
@Tag(name = "Preparação para Prova (Exam Prep)", description = "Gerenciamento de preparações para exames/provas")
public class ExamPrepController {

    private final ExamPrepService examPrepService;

    @Operation(summary = "Listar preparações para provas paginadas")
    @GetMapping
    public ResponseEntity<Page<ExamPrepResponseDTO>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(examPrepService.findAll(page, size));
    }

    @Operation(summary = "Buscar preparação para prova por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ExamPrepResponseDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(examPrepService.findById(id));
    }

    @Operation(summary = "Criar nova preparação para prova")
    @PostMapping
    public ResponseEntity<ExamPrepResponseDTO> create(@RequestBody @Valid ExamPrepRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examPrepService.create(request));
    }

    @Operation(summary = "Atualizar preparação para prova")
    @PutMapping("/{id}")
    public ResponseEntity<ExamPrepResponseDTO> update(
            @PathVariable Long id,
            @RequestBody @Valid ExamPrepRequestDTO request) {
        return ResponseEntity.ok(examPrepService.update(id, request));
    }

    @Operation(summary = "Deletar preparação para prova")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        examPrepService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Gerar link público de compartilhamento", description = "Cria um token UUID público para compartilhamento de estudos")
    @PostMapping("/{id}/share")
    public ResponseEntity<ExamPrepResponseDTO> share(@PathVariable Long id) {
        return ResponseEntity.ok(examPrepService.generateShareToken(id));
    }

    @Operation(summary = "Revogar link de compartilhamento", description = "Torna o plano de estudos privado novamente")
    @DeleteMapping("/{id}/share")
    public ResponseEntity<ExamPrepResponseDTO> revokeShare(@PathVariable Long id) {
        return ResponseEntity.ok(examPrepService.revokeShareToken(id));
    }

    @Operation(summary = "Buscar preparação pública por token", description = "Endpoint público para carregar plano de estudos compartilhado (sem autenticação)")
    @GetMapping("/public/share/{shareToken}")
    public ResponseEntity<ExamPrepResponseDTO> findPublicByToken(@PathVariable String shareToken) {
        return ResponseEntity.ok(examPrepService.findByShareToken(shareToken));
    }
}
