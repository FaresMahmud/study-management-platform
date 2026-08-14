package com.studyplatform.session;
import org.springframework.context.ApplicationEventPublisher;
import com.studyplatform.session.StudySession;
import com.studyplatform.session.StudySessionMapper;
import com.studyplatform.session.StudySessionRepository;
import com.studyplatform.session.dto.StudySessionRequestDTO;
import com.studyplatform.session.dto.StudySessionResponseDTO;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectRepository;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.event.EventListener;

// O ownership é verificado sempre via Subject (session → subject → user),
// pois StudySession não tem user_id diretamente.
@Service
@RequiredArgsConstructor
public class StudySessionService {

    private final StudySessionRepository studySessionRepository;
    private final SubjectRepository subjectRepository;
    private final StudySessionMapper studySessionMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final com.studyplatform.shared.security.SecurityService securityService;

    private User getAuthenticatedUser() {
        return securityService.getAuthenticatedUser();
    }

    private Subject findSubjectByIdAndUser(Long subjectId, Long userId) {
        return subjectRepository.findByIdAndUserId(subjectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Matéria não encontrada com o id: " + subjectId));
    }


    @org.springframework.cache.annotation.Cacheable(
        value = "studySessions",
        key = "T(org.springframework.security.core.context.SecurityContextHolder).getContext().getAuthentication().getName() + '_' + #page + '_' + #size"
    )
    @Transactional(readOnly = true)
    public Page<StudySessionResponseDTO> findAll(int page, int size) {
        User user = getAuthenticatedUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());

        return studySessionRepository.findBySubjectUserId(user.getId(), pageable)
                .map(studySessionMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public StudySessionResponseDTO findById(Long id) {
        User user = getAuthenticatedUser();

        StudySession session = studySessionRepository
                .findByIdAndSubjectUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Sessão de estudo não encontrada com o id: " + id));

        return studySessionMapper.toResponseDTO(session);
    }

    @org.springframework.cache.annotation.Caching(evict = {
        @org.springframework.cache.annotation.CacheEvict(value = "studySessions", allEntries = true),
        @org.springframework.cache.annotation.CacheEvict(value = "leaderboard", allEntries = true)
    })
    @Transactional
    public StudySessionResponseDTO create(StudySessionRequestDTO request) {
        User user = getAuthenticatedUser();
        Subject subject = findSubjectByIdAndUser(request.getSubjectId(), user.getId());

        StudySession session = studySessionMapper.toEntity(request, subject);
        StudySession savedSession = studySessionRepository.save(session);

        // Recalcula metas do usuário para o dia da sessão via evento
        eventPublisher.publishEvent(new StudySessionChangedEvent(user.getId(), savedSession.getSessionDate()));

        return studySessionMapper.toResponseDTO(savedSession);
    }

    @org.springframework.cache.annotation.Caching(evict = {
        @org.springframework.cache.annotation.CacheEvict(value = "studySessions", allEntries = true),
        @org.springframework.cache.annotation.CacheEvict(value = "leaderboard", allEntries = true)
    })
    @Transactional
    public StudySessionResponseDTO update(Long id, StudySessionRequestDTO request) {
        User user = getAuthenticatedUser();

        StudySession session = studySessionRepository
                .findByIdAndSubjectUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Sessão de estudo não encontrada com o id: " + id));

        java.time.LocalDate dataSessaoAntiga = session.getSessionDate();

        // O usuário pode mover a sessão pra outra matéria — o novo subject também é validado
        Subject subject = findSubjectByIdAndUser(request.getSubjectId(), user.getId());

        studySessionMapper.updateEntityFromDTO(session, request, subject);
        StudySession updatedSession = studySessionRepository.save(session);

        // Recalcula metas para a data antiga via evento
        eventPublisher.publishEvent(new StudySessionChangedEvent(user.getId(), dataSessaoAntiga));
        // E para a nova data
        if (!dataSessaoAntiga.equals(updatedSession.getSessionDate())) {
            eventPublisher.publishEvent(new StudySessionChangedEvent(user.getId(), updatedSession.getSessionDate()));
        }

        return studySessionMapper.toResponseDTO(updatedSession);
    }

    @org.springframework.cache.annotation.Caching(evict = {
        @org.springframework.cache.annotation.CacheEvict(value = "studySessions", allEntries = true),
        @org.springframework.cache.annotation.CacheEvict(value = "leaderboard", allEntries = true)
    })
    @Transactional
    public void delete(Long id) {
        User user = getAuthenticatedUser();

        StudySession session = studySessionRepository
                .findByIdAndSubjectUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Sessão de estudo não encontrada com o id: " + id));

        java.time.LocalDate dataSessao = session.getSessionDate();
        studySessionRepository.delete(session);

        // Recalcula metas via evento
        eventPublisher.publishEvent(new StudySessionChangedEvent(user.getId(), dataSessao));
    }

    /**
     * Remove de forma síncrona todas as sessões de estudo (StudySessions) vinculadas a uma matéria (Subject) deletada.
     * Executa na mesma transação da deleção original.
     */
    @EventListener
    @Transactional
    public void handleSubjectDeleted(com.studyplatform.subject.SubjectDeletedEvent event) {
        // Justificativa: Listener síncrono rodando na mesma transação. Se falhar, faz rollback da deleção principal.
        List<StudySession> sessions = studySessionRepository.findBySubjectId(event.subjectId());
        studySessionRepository.deleteAll(sessions);
    }
}
