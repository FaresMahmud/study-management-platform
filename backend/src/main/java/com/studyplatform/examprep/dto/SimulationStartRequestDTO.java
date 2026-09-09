package com.studyplatform.examprep.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimulationStartRequestDTO {
    private Long subjectId;
    private Long examPrepId;
    private Integer questionCount;
}
