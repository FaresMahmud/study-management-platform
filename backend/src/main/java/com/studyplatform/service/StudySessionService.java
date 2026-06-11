package com.studyplatform.service;

import com.studyplatform.dto.request.StudySessionRequestDTO;
import com.studyplatform.dto.response.StudySessionResponseDTO;
import com.studyplatform.entity.StudySession;
import com.studyplatform.entity.Subject;
import com.studyplatform.entity.User;
import com.studyplatform.exception.ResourceNotFoundException;
import com.studyplatform.mapper.StudySessionMapper;
import com.studyplatform.repository.StudySessionRepository;
import com.studyplatform.repository.SubjectRepository;
import com.studyplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

// O ownership é verificado sempre via Subject (session → subject → user),
// pois StudySession não tem user_id diretamente.
@Service
@RequiredArgsConstructor
public class StudySessionService {

    private final StudySessionRepository studySessionRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final StudySessionMapper studySessionMapper;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    private Subject findSubjectByIdAndUser(Long subjectId, Long userId) {
        return subjectRepository.findByIdAndUserId(subjectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Matéria não encontrada com o id: " + subjectId));
    }

    @Transactional(readOnly = true)
    public List<StudySessionResponseDTO> findAll() {
        User user = getAuthenticatedUser();

        return studySessionRepository.findBySubjectUserId(user.getId())
                .stream()
                .map(studySessionMapper::toResponseDTO)
                .collect(Collectors.toList());
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

    @Transactional
    public StudySessionResponseDTO create(StudySessionRequestDTO request) {
        User user = getAuthenticatedUser();
        Subject subject = findSubjectByIdAndUser(request.getSubjectId(), user.getId());

        StudySession session = studySessionMapper.toEntity(request, subject);
        StudySession savedSession = studySessionRepository.save(session);

        return studySessionMapper.toResponseDTO(savedSession);
    }

    @Transactional
    public StudySessionResponseDTO update(Long id, StudySessionRequestDTO request) {
        User user = getAuthenticatedUser();

        StudySession session = studySessionRepository
                .findByIdAndSubjectUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Sessão de estudo não encontrada com o id: " + id));

        // O usuário pode mover a sessão pra outra matéria — o novo subject também é validado
        Subject subject = findSubjectByIdAndUser(request.getSubjectId(), user.getId());

        studySessionMapper.updateEntityFromDTO(session, request, subject);
        StudySession updatedSession = studySessionRepository.save(session);

        return studySessionMapper.toResponseDTO(updatedSession);
    }

    @Transactional
    public void delete(Long id) {
        User user = getAuthenticatedUser();

        StudySession session = studySessionRepository
                .findByIdAndSubjectUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Sessão de estudo não encontrada com o id: " + id));

        studySessionRepository.delete(session);
    }
}
