package com.studyplatform.questionbank.dto;

import com.studyplatform.questionbank.QuestionFormat;
import com.studyplatform.questionbank.QuestionBankStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionBankItemResponseDTO {
    private Long id;
    private Long subjectId;
    private String questionText;
    private QuestionFormat format;
    private List<String> alternatives;
    private Integer correctAlternativeIndex;
    private String explanation;
    private String topicHint;
    private QuestionBankStatus status;
    private Integer timesUsed;
    private LocalDateTime createdAt;
}
