package com.studyplatform.examprep;

import com.studyplatform.examprep.dto.ExamPrepRequestDTO;
import com.studyplatform.examprep.dto.ExamPrepResponseDTO;
import com.studyplatform.user.User;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Component
public class ExamPrepMapper {

    public ExamPrep toEntity(ExamPrepRequestDTO dto, User user) {
        return ExamPrep.builder()
                .title(dto.getTitle())
                .examDate(dto.getExamDate())
                .targetScore(dto.getTargetScore())
                .status(ExamPrepStatus.valueOf(dto.getStatus().toUpperCase()))
                .user(user)
                .build();
    }

    public ExamPrepResponseDTO toResponseDTO(ExamPrep examPrep) {
        long daysRemaining = 0;
        if (examPrep.getExamDate() != null) {
            daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), examPrep.getExamDate());
        }

        return ExamPrepResponseDTO.builder()
                .id(examPrep.getId())
                .title(examPrep.getTitle())
                .examDate(examPrep.getExamDate())
                .targetScore(examPrep.getTargetScore())
                .status(examPrep.getStatus().name())
                .daysRemaining(daysRemaining)
                .userId(examPrep.getUser().getId())
                .shareToken(examPrep.getShareToken())
                .isPublic(examPrep.getIsPublic())
                .createdAt(examPrep.getCreatedAt())
                .updatedAt(examPrep.getUpdatedAt())
                .build();
    }

    public void updateEntityFromDTO(ExamPrep examPrep, ExamPrepRequestDTO dto) {
        examPrep.setTitle(dto.getTitle());
        examPrep.setExamDate(dto.getExamDate());
        examPrep.setTargetScore(dto.getTargetScore());
        examPrep.setStatus(ExamPrepStatus.valueOf(dto.getStatus().toUpperCase()));
    }
}
