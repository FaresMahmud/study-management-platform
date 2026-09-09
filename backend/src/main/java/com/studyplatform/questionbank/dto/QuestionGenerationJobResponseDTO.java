package com.studyplatform.questionbank.dto;

import com.studyplatform.questionbank.JobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionGenerationJobResponseDTO {
    private String jobId;
    private Long subjectId;
    private Integer requestedCount;
    private Integer generatedCount;
    private JobStatus status;
    private String errorMessage;
    private StyleProfileDTO styleProfile;
    private LocalDateTime createdAt;
    private LocalDateTime finishedAt;
}
