package com.studyplatform.examprep;

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

    @Operation(summary = "Iniciar simulado cronometrado", description = "Gera 3 questões inéditas via IA sem respostas imediatas e inicia o cronômetro de 15 minutos")
    @PostMapping("/start")
    public ResponseEntity<ExamSimulation> start(@RequestParam Long examPrepId) {
        ExamSimulation simulation = examSimulationService.startSimulation(examPrepId);
        return ResponseEntity.ok(simulation);
    }

    @Operation(summary = "Finalizar simulado cronometrado", description = "Corrige as respostas submetidas pelo aluno, calcula a pontuação final e atualiza a maestria")
    @PostMapping("/finish/{id}")
    public ResponseEntity<ExamSimulation> finish(
            @PathVariable Long id,
            @RequestBody Map<Integer, String> answers) {
        ExamSimulation simulation = examSimulationService.finishSimulation(id, answers);
        return ResponseEntity.ok(simulation);
    }
}
