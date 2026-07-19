package com.studyplatform.flashcard;
import com.studyplatform.flashcard.Flashcard;
import com.studyplatform.flashcard.dto.FlashcardRequestDTO;
import com.studyplatform.flashcard.dto.FlashcardResponseDTO;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectMapper;
import com.studyplatform.summary.Summary;
import com.studyplatform.user.User;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FlashcardMapper {

    private final SubjectMapper subjectMapper;

    public Flashcard toEntity(FlashcardRequestDTO dto, User user, Subject subject, Summary summary) {
        return Flashcard.builder()
                .front(dto.getFront())
                .back(dto.getBack())
                .nextReviewDate(LocalDateTime.now())
                .box(LeitnerBox.initial())
                .user(user)
                .subject(subject)
                .summary(summary)
                .build();
    }

    public FlashcardResponseDTO toResponseDTO(Flashcard flashcard) {
        return FlashcardResponseDTO.builder()
                .id(flashcard.getId())
                .front(flashcard.getFront())
                .back(flashcard.getBack())
                .nextReviewDate(flashcard.getNextReviewDate())
                .box(flashcard.getBox() != null ? flashcard.getBox().value() : 1)
                .creationDate(flashcard.getCreationDate())
                .userId(flashcard.getUser().getId())
                .subject(flashcard.getSubject() != null ? subjectMapper.toResponseDTO(flashcard.getSubject()) : null)
                .summaryId(flashcard.getSummary() != null ? flashcard.getSummary().getId() : null)
                .summaryTitle(flashcard.getSummary() != null ? flashcard.getSummary().getTitle() : null)
                .build();
    }

    public void updateEntityFromDTO(Flashcard flashcard, FlashcardRequestDTO dto, Subject subject, Summary summary) {
        flashcard.setFront(dto.getFront());
        flashcard.setBack(dto.getBack());
        flashcard.setSubject(subject);
        flashcard.setSummary(summary);
    }
}
