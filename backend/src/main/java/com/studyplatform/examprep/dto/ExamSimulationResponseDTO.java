package com.studyplatform.examprep.dto;

import com.studyplatform.examprep.SimulationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO de resposta para simulados — evita serialização de proxies Hibernate.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamSimulationResponseDTO {

    private Long id;
    private Long examPrepId;
    private String examPrepTitle;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer score;
    private SimulationStatus status;
    private String contentJson;
}
