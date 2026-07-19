package com.studyplatform.flashcard.dto;
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
public class FlashcardResponseDTO {

    private Long id;
    private String front;
    private String back;
    private LocalDateTime nextReviewDate;
    private Integer box;
    private LocalDateTime creationDate;
    private Long userId;
    private SubjectResponseDTO subject;
    private Long summaryId;
    private String summaryTitle;
}
