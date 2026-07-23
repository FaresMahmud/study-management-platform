package com.studyplatform.examprep.simulation.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ExamSimulationStartRequest {
    @NotNull
    private Long examPrepId;
}
