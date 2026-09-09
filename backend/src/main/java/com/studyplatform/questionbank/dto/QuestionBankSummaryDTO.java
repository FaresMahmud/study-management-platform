package com.studyplatform.questionbank.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionBankSummaryDTO {
    private Long subjectId;
    private String subjectName;
    private long totalQuestions;
    private long activeQuestions;
    private long usedQuestions;
    private StyleProfileDTO styleProfile;
    private String detectionSource;
    private Boolean isGenerating;
    private String activeJobId;
}
