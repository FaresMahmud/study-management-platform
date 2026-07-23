package com.studyplatform.examprep.simulation;

import com.studyplatform.examprep.simulation.dto.ExamSimulationResponse;
import com.studyplatform.examprep.simulation.dto.ExamSimulationStartRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.studyplatform.quiz.dto.QuizAnswerRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/simulations")
@RequiredArgsConstructor
@Tag(name = "Exam Simulations", description = "Endpoints for managing exam simulations")
public class ExamSimulationController {

    private final ExamSimulationService examSimulationService;

    @PostMapping("/start")
    @Operation(summary = "Starts a new exam simulation")
    public ResponseEntity<ExamSimulationResponse> startSimulation(@Valid @RequestBody ExamSimulationStartRequest request) {
        ExamSimulationResponse response = examSimulationService.startSimulation(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/finish")
    @Operation(summary = "Finish an exam simulation and get evaluation")
    public ResponseEntity<ExamSimulationResponse> finishSimulation(
            @PathVariable Long id,
            @RequestBody java.util.List<QuizAnswerRequest> answers) {
        ExamSimulationResponse response = examSimulationService.finishSimulation(id, answers);
        return ResponseEntity.ok(response);
    }
}
