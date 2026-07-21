package com.studyplatform.examprep;

import lombok.Data;

/**
 * DTO de requisição para registrar uma tentativa de quiz.
 */
@Data
public class QuizAttemptRequest {
    private Long examPrepId;
    private Integer correctAnswers;
    private Integer totalQuestions;
    private String contentJson;
}
