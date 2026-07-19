package com.studyplatform.flashcard;
import com.studyplatform.flashcard.Flashcard;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FlashcardRepository extends JpaRepository<Flashcard, Long> {

    Page<Flashcard> findByUserId(Long userId, Pageable pageable);

    Optional<Flashcard> findByIdAndUserId(Long id, Long userId);

    List<Flashcard> findByUserIdAndSubjectId(Long userId, Long subjectId);

    List<Flashcard> findByUserIdAndNextReviewDateBefore(Long userId, LocalDateTime date);
}
