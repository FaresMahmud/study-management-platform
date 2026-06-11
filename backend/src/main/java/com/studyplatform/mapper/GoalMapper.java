package com.studyplatform.mapper;

import com.studyplatform.dto.request.GoalRequestDTO;
import com.studyplatform.dto.response.GoalResponseDTO;
import com.studyplatform.entity.Goal;
import com.studyplatform.entity.Subject;
import com.studyplatform.entity.User;
import org.springframework.stereotype.Component;

@Component
public class GoalMapper {

    public Goal toEntity(GoalRequestDTO dto, User user, Subject subject) {
        return Goal.builder()
                .title(dto.getTitle())
                .progress(dto.getProgress())
                .objectiveHours(dto.getObjectiveHours())
                .startDateGoal(dto.getStartDateGoal())
                .endDateGoal(dto.getEndDateGoal())
                .user(user)
                .subject(subject)
                .build();
    }

    public GoalResponseDTO toResponseDTO(Goal goal) {
        // Calcula percentual de conclusão — protege contra divisão por zero
        double percentage = 0.0;
        if (goal.getObjectiveHours() != null && goal.getObjectiveHours() > 0) {
            percentage = (goal.getProgress() / goal.getObjectiveHours()) * 100;
            percentage = Math.min(percentage, 100.0);
            percentage = Math.round(percentage * 100.0) / 100.0;
        }

        return GoalResponseDTO.builder()
                .id(goal.getId())
                .title(goal.getTitle())
                .progress(goal.getProgress())
                .objectiveHours(goal.getObjectiveHours())
                .startDateGoal(goal.getStartDateGoal())
                .endDateGoal(goal.getEndDateGoal())
                .completionPercentage(percentage)
                .userId(goal.getUser().getId())
                .userName(goal.getUser().getNameUser())
                .subjectId(goal.getSubject() != null ? goal.getSubject().getId() : null)
                .subjectName(goal.getSubject() != null ? goal.getSubject().getSubjectName() : null)
                .build();
    }

    public void updateEntityFromDTO(Goal goal, GoalRequestDTO dto, Subject newSubject) {
        goal.setTitle(dto.getTitle());
        goal.setProgress(dto.getProgress());
        goal.setObjectiveHours(dto.getObjectiveHours());
        goal.setStartDateGoal(dto.getStartDateGoal());
        goal.setEndDateGoal(dto.getEndDateGoal());
        goal.setSubject(newSubject);
    }
}
