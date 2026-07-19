package com.studyplatform.session.dto;
import com.studyplatform.session.StudySession;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.dto.SubjectResponseDTO;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    private SubjectResponseDTO subject;
}
