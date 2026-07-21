package com.studyplatform.subject;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectMapper;
import com.studyplatform.subject.SubjectRepository;
import com.studyplatform.subject.dto.SubjectRequestDTO;
import com.studyplatform.subject.dto.SubjectResponseDTO;
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

// Toda operação sempre filtra pelo usuário autenticado — um usuário nunca vê dados de outro.
@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final SubjectMapper subjectMapper;
    private final com.studyplatform.examprep.ExamPrepRepository examPrepRepository;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }


    @Transactional(readOnly = true)
    public Page<SubjectResponseDTO> findAll(int page, int size) {
        User user = getAuthenticatedUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());

        return subjectRepository.findByUserId(user.getId(), pageable)
                .map(subjectMapper::toResponseDTO);
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
        if (request.getExamPrepId() != null) {
            subject.setExamPrep(examPrepRepository.findByIdAndUserId(request.getExamPrepId(), user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Preparação para prova não encontrada")));
        }

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
        if (request.getExamPrepId() != null) {
            subject.setExamPrep(examPrepRepository.findByIdAndUserId(request.getExamPrepId(), user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Preparação para prova não encontrada")));
        } else {
            subject.setExamPrep(null);
        }

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
