package com.studyplatform.examprep;

import com.studyplatform.examprep.dto.ExamPrepRequestDTO;
import com.studyplatform.examprep.dto.ExamPrepResponseDTO;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
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
public class ExamPrepService {

    private final ExamPrepRepository examPrepRepository;
    private final UserRepository userRepository;
    private final ExamPrepMapper examPrepMapper;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    @Transactional(readOnly = true)
    public Page<ExamPrepResponseDTO> findAll(int page, int size) {
        User user = getAuthenticatedUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return examPrepRepository.findByUserId(user.getId(), pageable)
                .map(examPrepMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public ExamPrepResponseDTO findById(Long id) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Preparação para prova não encontrada com o id: " + id));
        return examPrepMapper.toResponseDTO(examPrep);
    }

    @Transactional
    public ExamPrepResponseDTO create(ExamPrepRequestDTO request) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepMapper.toEntity(request, user);
        ExamPrep saved = examPrepRepository.save(examPrep);
        return examPrepMapper.toResponseDTO(saved);
    }

    @Transactional
    public ExamPrepResponseDTO update(Long id, ExamPrepRequestDTO request) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Preparação para prova não encontrada com o id: " + id));

        examPrepMapper.updateEntityFromDTO(examPrep, request);
        ExamPrep updated = examPrepRepository.save(examPrep);
        return examPrepMapper.toResponseDTO(updated);
    }

    @Transactional
    public void delete(Long id) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Preparação para prova não encontrada com o id: " + id));
        examPrepRepository.delete(examPrep);
    }

    @Transactional
    public ExamPrepResponseDTO generateShareToken(Long id) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Preparação para prova não encontrada com o id: " + id));

        examPrep.setShareToken(java.util.UUID.randomUUID().toString());
        examPrep.setIsPublic(true);
        ExamPrep saved = examPrepRepository.save(examPrep);
        return examPrepMapper.toResponseDTO(saved);
    }

    @Transactional
    public ExamPrepResponseDTO revokeShareToken(Long id) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Preparação para prova não encontrada com o id: " + id));

        examPrep.setShareToken(null);
        examPrep.setIsPublic(false);
        ExamPrep saved = examPrepRepository.save(examPrep);
        return examPrepMapper.toResponseDTO(saved);
    }

    @Transactional(readOnly = true)
    public ExamPrepResponseDTO findByShareToken(String shareToken) {
        ExamPrep examPrep = examPrepRepository.findByShareToken(shareToken)
                .orElseThrow(() -> new ResourceNotFoundException("Link de compartilhamento inválido ou expirado."));

        if (!examPrep.getIsPublic()) {
            throw new com.studyplatform.shared.exception.BusinessException("Este plano de estudos não é público.");
        }

        return examPrepMapper.toResponseDTO(examPrep);
    }
}
