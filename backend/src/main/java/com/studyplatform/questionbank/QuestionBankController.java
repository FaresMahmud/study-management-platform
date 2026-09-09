package com.studyplatform.questionbank;

import com.studyplatform.questionbank.dto.QuestionBankItemResponseDTO;
import com.studyplatform.questionbank.dto.QuestionBankSummaryDTO;
import com.studyplatform.questionbank.dto.QuestionGenerationJobRequestDTO;
import com.studyplatform.questionbank.dto.QuestionGenerationJobResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Banco de Questões e Geração IA", description = "APIs para extração de perfil de banca, banco de questões e geração assíncrona")
public class QuestionBankController {

    private final QuestionGenerationJobService jobService;
    private final QuestionBankService questionBankService;

    @Operation(summary = "Iniciar job assíncrono de geração de questões",
               description = "Inicia geração em lotes de 5 questões sem travar a thread HTTP, detectando ou reutilizando o estilo da matéria")
    @PostMapping("/subjects/{subjectId}/question-generation-jobs")
    public ResponseEntity<QuestionGenerationJobResponseDTO> startJob(
            @PathVariable Long subjectId,
            @RequestBody(required = false) QuestionGenerationJobRequestDTO request) {

        int count = (request != null && request.getCount() != null) ? request.getCount() : 10;
        boolean regenerate = (request != null && request.getRegenerateStyle() != null) && request.getRegenerateStyle();

        QuestionGenerationJobResponseDTO response = jobService.startJob(subjectId, count, regenerate);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Consultar status e progresso de um job de geração de questões")
    @GetMapping("/question-generation-jobs/{jobId}")
    public ResponseEntity<QuestionGenerationJobResponseDTO> getJobStatus(@PathVariable String jobId) {
        return ResponseEntity.ok(jobService.getJobStatus(jobId));
    }

    @Operation(summary = "Obter resumo do banco de questões e perfil de estilo da matéria")
    @GetMapping("/subjects/{subjectId}/question-bank/summary")
    public ResponseEntity<QuestionBankSummaryDTO> getSummary(@PathVariable Long subjectId) {
        return ResponseEntity.ok(questionBankService.getSubjectQuestionBankSummary(subjectId));
    }

    @Operation(summary = "Listar questões recentes do banco da matéria")
    @GetMapping("/subjects/{subjectId}/question-bank/items")
    public ResponseEntity<List<QuestionBankItemResponseDTO>> listItems(
            @PathVariable Long subjectId,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(questionBankService.listItems(subjectId, limit));
    }
}
