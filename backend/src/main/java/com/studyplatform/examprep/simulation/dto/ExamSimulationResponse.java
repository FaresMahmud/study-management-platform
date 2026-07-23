package com.studyplatform.examprep.simulation.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ExamSimulationResponse {
    private Long id;
    private String title;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Double score;
    private Long userId;
    private Long examPrepId;
    private Long quizId;
    private java.util.List<java.util.Map<String, Object>> questions;
}
