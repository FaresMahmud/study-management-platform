package com.studyplatform.service;

import com.studyplatform.dto.request.GoalRequestDTO;
import com.studyplatform.dto.response.GoalResponseDTO;
import com.studyplatform.entity.Goal;
import com.studyplatform.entity.Subject;
import com.studyplatform.entity.User;
import com.studyplatform.exception.BusinessException;
import com.studyplatform.exception.ResourceNotFoundException;
import com.studyplatform.mapper.GoalMapper;
import com.studyplatform.repository.GoalRepository;
import com.studyplatform.repository.SubjectRepository;
import com.studyplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GoalService {

    private final GoalRepository goalRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final GoalMapper goalMapper;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    // Retorna null se subjectId for null (meta geral), ou valida o ownership se informado.
    private Subject resolveSubject(Long subjectId, Long userId) {
        if (subjectId == null) {
            return null;
        }

        return subjectRepository.findByIdAndUserId(subjectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Matéria não encontrada com o id: " + subjectId));
    }

    private void validateGoalRules(GoalRequestDTO request) {
        if (request.getEndDateGoal().isBefore(request.getStartDateGoal())) {
            throw new BusinessException("A data de término deve ser posterior à data de início");
        }

        if (request.getProgress() > request.getObjectiveHours()) {
            throw new BusinessException(
                    "O progresso (" + request.getProgress() + "h) não pode ser maior que o objetivo ("
                    + request.getObjectiveHours() + "h)");
        }
    }

    @Transactional(readOnly = true)
    public List<GoalResponseDTO> findAll() {
        User user = getAuthenticatedUser();

        return goalRepository.findByUserId(user.getId())
                .stream()
                .map(goalMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GoalResponseDTO findById(Long id) {
        User user = getAuthenticatedUser();

        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meta não encontrada com o id: " + id));

        return goalMapper.toResponseDTO(goal);
    }

    @Transactional
    public GoalResponseDTO create(GoalRequestDTO request) {
        User user = getAuthenticatedUser();
        validateGoalRules(request);

        Subject subject = resolveSubject(request.getSubjectId(), user.getId());
        Goal goal = goalMapper.toEntity(request, user, subject);
        Goal savedGoal = goalRepository.save(goal);

        return goalMapper.toResponseDTO(savedGoal);
    }

    @Transactional
    public GoalResponseDTO update(Long id, GoalRequestDTO request) {
        User user = getAuthenticatedUser();

        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meta não encontrada com o id: " + id));

        validateGoalRules(request);

        Subject subject = resolveSubject(request.getSubjectId(), user.getId());
        goalMapper.updateEntityFromDTO(goal, request, subject);
        Goal updatedGoal = goalRepository.save(goal);

        return goalMapper.toResponseDTO(updatedGoal);
    }

    @Transactional
    public void delete(Long id) {
        User user = getAuthenticatedUser();

        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meta não encontrada com o id: " + id));

        goalRepository.delete(goal);
    }
}
