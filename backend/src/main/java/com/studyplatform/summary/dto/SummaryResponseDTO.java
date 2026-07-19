package com.studyplatform.summary.dto;
import com.studyplatform.subject.dto.SubjectResponseDTO;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SummaryResponseDTO {

    private Long id;
    private String title;
    private String content;
    private LocalDateTime creationDate;
    private LocalDateTime lastModifiedDate;
    private Long userId;
    private String userName;
    private SubjectResponseDTO subject;
}
