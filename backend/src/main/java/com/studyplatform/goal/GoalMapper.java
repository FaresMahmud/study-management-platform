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
                .progress(dto.getProgress() != null ? dto.getProgress() : 0.0)
                .objectiveHours(dto.getObjectiveHours())
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
                .progress(goal.getProgress())
                .objectiveHours(goal.getObjectiveHours())
                .startDateGoal(goal.getStartDateGoal())
                .endDateGoal(goal.getEndDateGoal())
                .completionPercentage(goal.getCompletionPercentage())
                .userId(goal.getUser().getId())
                .userName(goal.getUser().getNameUser())
                .subject(goal.getSubject() != null ? subjectMapper.toResponseDTO(goal.getSubject()) : null)
                .build();
    }

    public void updateEntityFromDTO(Goal goal, GoalRequestDTO dto, Subject newSubject) {
        goal.setTitle(dto.getTitle());
        if (dto.getProgress() != null) {
            goal.setProgress(dto.getProgress());
        }
        goal.setObjectiveHours(dto.getObjectiveHours());
        goal.setStartDateGoal(dto.getStartDateGoal());
        goal.setEndDateGoal(dto.getEndDateGoal());
        goal.setSubject(newSubject);
    }
}
