package com.studyplatform.examprep.simulation;

import com.studyplatform.examprep.simulation.dto.ExamSimulationResponse;
import org.springframework.stereotype.Component;

@Component
public class ExamSimulationMapper {

    public ExamSimulationResponse toResponseDTO(ExamSimulation examSimulation) {
        if (examSimulation == null) {
            return null;
        }

        return ExamSimulationResponse.builder()
                .id(examSimulation.getId())
                .title(examSimulation.getTitle())
                .startTime(examSimulation.getStartTime())
                .endTime(examSimulation.getEndTime())
                .score(examSimulation.getScore())
                .userId(examSimulation.getUser() != null ? examSimulation.getUser().getId() : null)
                .examPrepId(examSimulation.getExamPrep() != null ? examSimulation.getExamPrep().getId() : null)
                .build();
    }

    public ExamSimulationResponse toResponseDTO(ExamSimulation examSimulation, Long quizId, java.util.List<java.util.Map<String, Object>> questions) {
        if (examSimulation == null) {
            return null;
        }
        ExamSimulationResponse response = toResponseDTO(examSimulation);
        response.setQuizId(quizId);
        response.setQuestions(questions);
        return response;
    }
}
