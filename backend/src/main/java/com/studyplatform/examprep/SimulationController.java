package com.studyplatform.examprep;

import com.studyplatform.examprep.dto.ExamSimulationResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller responsável por expor as APIs de gerenciamento de simulados cronometrados.
 */
@RestController
@RequestMapping("/api/v1/simulation")
@RequiredArgsConstructor
@Tag(name = "Simulados", description = "APIs para iniciar e finalizar simulados cronometrados de 15 minutos")
public class SimulationController {

    private final ExamSimulationService examSimulationService;

    @Operation(summary = "Iniciar simulado cronometrado",
               description = "Inicia simulado a partir do banco de questões da matéria ou dispara geração assíncrona")
    @PostMapping("/start")
    public ResponseEntity<ExamSimulationResponseDTO> start(
            @RequestParam(required = false) Long examPrepId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false, defaultValue = "10") Integer questionCount,
            @RequestBody(required = false) com.studyplatform.examprep.dto.SimulationStartRequestDTO request) {

        Long targetExamPrepId = (request != null && request.getExamPrepId() != null) ? request.getExamPrepId() : examPrepId;
        Long targetSubjectId = (request != null && request.getSubjectId() != null) ? request.getSubjectId() : subjectId;
        Integer targetCount = (request != null && request.getQuestionCount() != null) ? request.getQuestionCount() : questionCount;

        ExamSimulationResponseDTO simulation = examSimulationService.startSimulation(targetExamPrepId, targetSubjectId, targetCount);
        return ResponseEntity.ok(simulation);
    }

    @Operation(summary = "Finalizar simulado cronometrado", description = "Corrige as respostas submetidas pelo aluno, calcula a pontuação final e atualiza a maestria")
    @PostMapping("/finish/{id}")
    public ResponseEntity<ExamSimulationResponseDTO> finish(
            @PathVariable Long id,
            @RequestBody Map<Integer, String> answers) {
        ExamSimulationResponseDTO simulation = examSimulationService.finishSimulation(id, answers);
        return ResponseEntity.ok(simulation);
    }
}
