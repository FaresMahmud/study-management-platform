package com.studyplatform.examprep.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamPrepResponseDTO {

    private Long id;
    private String title;
    private LocalDate examDate;
    private Integer targetScore;
    private String status;
    private Long daysRemaining; // Dias que faltam para a data da prova
    private Long userId;
    private String shareToken;
    private Boolean isPublic;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
