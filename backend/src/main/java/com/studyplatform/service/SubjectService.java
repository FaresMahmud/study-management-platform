package com.studyplatform.service;

import com.studyplatform.dto.request.SubjectRequestDTO;
import com.studyplatform.dto.response.SubjectResponseDTO;
import com.studyplatform.entity.Subject;
import com.studyplatform.entity.User;
import com.studyplatform.exception.BusinessException;
import com.studyplatform.exception.ResourceNotFoundException;
import com.studyplatform.mapper.SubjectMapper;
import com.studyplatform.repository.SubjectRepository;
import com.studyplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

// Toda operação sempre filtra pelo usuário autenticado — um usuário nunca vê dados de outro.
@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final SubjectMapper subjectMapper;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    @Transactional(readOnly = true)
    public List<SubjectResponseDTO> findAll() {
        User user = getAuthenticatedUser();

        return subjectRepository.findByUserId(user.getId())
                .stream()
                .map(subjectMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SubjectResponseDTO findById(Long id) {
        User user = getAuthenticatedUser();

        Subject subject = subjectRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Matéria não encontrada com o id: " + id));

        return subjectMapper.toResponseDTO(subject);
    }

    @Transactional
    public SubjectResponseDTO create(SubjectRequestDTO request) {
        User user = getAuthenticatedUser();

        if (subjectRepository.existsBySubjectNameAndUserId(request.getSubjectName(), user.getId())) {
            throw new BusinessException("Você já possui uma matéria com o nome: " + request.getSubjectName());
        }

        Subject subject = subjectMapper.toEntity(request, user);
        Subject savedSubject = subjectRepository.save(subject);

        return subjectMapper.toResponseDTO(savedSubject);
    }

    @Transactional
    public SubjectResponseDTO update(Long id, SubjectRequestDTO request) {
        User user = getAuthenticatedUser();

        Subject subject = subjectRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Matéria não encontrada com o id: " + id));

        // Só verifica duplicidade se o nome mudou
        if (!subject.getSubjectName().equals(request.getSubjectName()) &&
            subjectRepository.existsBySubjectNameAndUserId(request.getSubjectName(), user.getId())) {
            throw new BusinessException("Você já possui uma matéria com o nome: " + request.getSubjectName());
        }

        subjectMapper.updateEntityFromDTO(subject, request);
        Subject updatedSubject = subjectRepository.save(subject);

        return subjectMapper.toResponseDTO(updatedSubject);
    }

    @Transactional
    public void delete(Long id) {
        User user = getAuthenticatedUser();

        Subject subject = subjectRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Matéria não encontrada com o id: " + id));

        // CascadeType.ALL na entidade cuida de deletar sessions e goals junto
        subjectRepository.delete(subject);
    }
}
