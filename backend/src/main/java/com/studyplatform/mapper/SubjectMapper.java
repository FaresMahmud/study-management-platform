package com.studyplatform.mapper;

import com.studyplatform.dto.request.SubjectRequestDTO;
import com.studyplatform.dto.response.SubjectResponseDTO;
import com.studyplatform.entity.Subject;
import com.studyplatform.entity.User;
import org.springframework.stereotype.Component;

// Conversão entre Subject entity e DTOs. O mapper não acessa o banco — isso é trabalho do Service.
@Component
public class SubjectMapper {

    public Subject toEntity(SubjectRequestDTO dto, User user) {
        return Subject.builder()
                .subjectName(dto.getSubjectName())
                .subjectDescription(dto.getSubjectDescription())
                .color(dto.getColor())
                .user(user)
                .build();
    }

    public SubjectResponseDTO toResponseDTO(Subject subject) {
        return SubjectResponseDTO.builder()
                .id(subject.getId())
                .subjectName(subject.getSubjectName())
                .subjectDescription(subject.getSubjectDescription())
                .color(subject.getColor())
                .userId(subject.getUser().getId())
                .userName(subject.getUser().getNameUser())
                .build();
    }

    // No PUT: atualiza os campos sem criar uma nova entidade. id e user nunca mudam.
    public void updateEntityFromDTO(Subject subject, SubjectRequestDTO dto) {
        subject.setSubjectName(dto.getSubjectName());
        subject.setSubjectDescription(dto.getSubjectDescription());
        subject.setColor(dto.getColor());
    }
}
