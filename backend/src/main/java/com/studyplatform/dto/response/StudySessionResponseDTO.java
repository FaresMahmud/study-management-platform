package com.studyplatform.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO de saída para StudySession.
 *
 * Inclui dados básicos do Subject pai para que o frontend
 * exiba o contexto da sessão sem precisar de outra requisição.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudySessionResponseDTO {

    private Long id;
    private Integer duration;
    private LocalDate sessionDate;
    private String observations;

    // Dados mínimos do Subject pai
    private Long subjectId;
    private String subjectName;
    private String subjectColor;
}
