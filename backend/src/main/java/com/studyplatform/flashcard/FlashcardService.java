package com.studyplatform.flashcard;
import com.studyplatform.flashcard.Flashcard;
import com.studyplatform.flashcard.FlashcardMapper;
import com.studyplatform.flashcard.FlashcardRepository;
import com.studyplatform.flashcard.dto.FlashcardRequestDTO;
import com.studyplatform.flashcard.dto.FlashcardResponseDTO;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectRepository;
import com.studyplatform.summary.Summary;
import com.studyplatform.summary.SummaryRepository;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FlashcardService {

    private final FlashcardRepository flashcardRepository;
    private final SubjectRepository subjectRepository;
    private final SummaryRepository summaryRepository;
    private final UserRepository userRepository;
    private final FlashcardMapper flashcardMapper;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    private Subject findSubjectByIdAndUser(Long subjectId, Long userId) {
        return subjectRepository.findByIdAndUserId(subjectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Matéria não encontrada"));
    }


    @Transactional(readOnly = true)
    public Page<FlashcardResponseDTO> findAll(int page, int size) {
        User user = getAuthenticatedUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());

        return flashcardRepository.findByUserId(user.getId(), pageable)
                .map(flashcardMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public List<FlashcardResponseDTO> findDue() {
        User user = getAuthenticatedUser();
        return flashcardRepository.findByUserIdAndNextReviewDateBefore(user.getId(), LocalDateTime.now())
                .stream()
                .map(flashcardMapper::toResponseDTO)
                .toList();
    }

    @Transactional
    public FlashcardResponseDTO create(FlashcardRequestDTO request) {
        User user = getAuthenticatedUser();
        Subject subject = findSubjectByIdAndUser(request.getSubjectId(), user.getId());
        
        Summary summary = null;
        if (request.getSummaryId() != null) {
            summary = summaryRepository.findByIdAndUserId(request.getSummaryId(), user.getId())
                    .orElse(null);
        }

        Flashcard flashcard = flashcardMapper.toEntity(request, user, subject, summary);
        Flashcard saved = flashcardRepository.save(flashcard);
        return flashcardMapper.toResponseDTO(saved);
    }

    @Transactional
    public FlashcardResponseDTO update(Long id, FlashcardRequestDTO request) {
        User user = getAuthenticatedUser();
        Flashcard flashcard = flashcardRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado"));

        Subject subject = findSubjectByIdAndUser(request.getSubjectId(), user.getId());
        
        Summary summary = null;
        if (request.getSummaryId() != null) {
            summary = summaryRepository.findByIdAndUserId(request.getSummaryId(), user.getId())
                    .orElse(null);
        }

        flashcardMapper.updateEntityFromDTO(flashcard, request, subject, summary);
        Flashcard updated = flashcardRepository.save(flashcard);
        return flashcardMapper.toResponseDTO(updated);
    }

    @Transactional
    public FlashcardResponseDTO review(Long id, String quality) {
        User user = getAuthenticatedUser();
        Flashcard flashcard = flashcardRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado"));

        flashcard.recordReview(quality);
        
        Flashcard updated = flashcardRepository.save(flashcard);
        return flashcardMapper.toResponseDTO(updated);
    }

    @Transactional
    public void delete(Long id) {
        User user = getAuthenticatedUser();
        Flashcard flashcard = flashcardRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado"));
        flashcardRepository.delete(flashcard);
    }
}
