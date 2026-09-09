package com.studyplatform.questionbank.dto;

import lombok.Data;

@Data
public class QuestionGenerationJobRequestDTO {
    private Integer count = 10;
    private Boolean regenerateStyle = false;
}
