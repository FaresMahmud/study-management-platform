package com.studyplatform.goal;
import com.studyplatform.goal.Goal;
import com.studyplatform.goal.dto.GoalRequestDTO;
import com.studyplatform.goal.dto.GoalResponseDTO;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectMapper;
import com.studyplatform.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GoalMapper {

    private final SubjectMapper subjectMapper;

    public Goal toEntity(GoalRequestDTO dto, User user, Subject subject) {
        return Goal.builder()
                .title(dto.getTitle())
                .currentMastery(dto.getCurrentMastery() != null ? dto.getCurrentMastery() : 0)
                .targetMastery(dto.getTargetMastery())
                .startDateGoal(dto.getStartDateGoal())
                .endDateGoal(dto.getEndDateGoal())
                .user(user)
                .subject(subject)
                .build();
    }

    public GoalResponseDTO toResponseDTO(Goal goal) {
        return GoalResponseDTO.builder()
                .id(goal.getId())
                .title(goal.getTitle())
                .currentMastery(goal.getCurrentMastery())
                .targetMastery(goal.getTargetMastery())
                .startDateGoal(goal.getStartDateGoal())
                .endDateGoal(goal.getEndDateGoal())
                .completionPercentage(goal.getCompletionPercentage())
                .userId(goal.getUser().getId())
                .userName(goal.getUser().getNameUser())
                .subject(goal.getSubject() != null ? subjectMapper.toResponseDTO(goal.getSubject()) : null)
                .examPrepId(goal.getExamPrep() != null ? goal.getExamPrep().getId() : null)
                .examPrepTitle(goal.getExamPrep() != null ? goal.getExamPrep().getTitle() : null)
                .build();
    }

    public void updateEntityFromDTO(Goal goal, GoalRequestDTO dto, Subject newSubject) {
        goal.setTitle(dto.getTitle());
        if (dto.getCurrentMastery() != null) {
            goal.setCurrentMastery(dto.getCurrentMastery());
        }
        goal.setTargetMastery(dto.getTargetMastery());
        goal.setStartDateGoal(dto.getStartDateGoal());
        goal.setEndDateGoal(dto.getEndDateGoal());
        goal.setSubject(newSubject);
    }
}
