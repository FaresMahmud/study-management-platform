package com.studyplatform.analytics;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "APIs de relatório, histórico e zona de aprendizado (gamificação)")
public class AnalyticsController {

    private final LearningZoneService learningZoneService;

    @Operation(summary = "Obter dados da Zona de Aprendizado", description = "Compila métricas de precisão, tempo, streak de estudos e categoriza a zona de domínio do aluno")
    @GetMapping("/learning-zone")
    public ResponseEntity<LearningZoneResponseDTO> getLearningZone(@RequestParam Long examPrepId) {
        LearningZoneResponseDTO response = learningZoneService.getLearningZone(examPrepId);
        return ResponseEntity.ok(response);
    }
}
