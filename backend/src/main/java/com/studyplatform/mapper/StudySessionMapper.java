package com.studyplatform.mapper;

import com.studyplatform.dto.request.StudySessionRequestDTO;
import com.studyplatform.dto.response.StudySessionResponseDTO;
import com.studyplatform.entity.StudySession;
import com.studyplatform.entity.Subject;
import org.springframework.stereotype.Component;

@Component
public class StudySessionMapper {

    // O Subject já chegou validado do Service — o mapper só monta a entidade.
    public StudySession toEntity(StudySessionRequestDTO dto, Subject subject) {
        return StudySession.builder()
                .duration(dto.getDuration())
                .sessionDate(dto.getSessionDate())
                .observations(dto.getObservations())
                .subject(subject)
                .build();
    }

    public StudySessionResponseDTO toResponseDTO(StudySession session) {
        return StudySessionResponseDTO.builder()
                .id(session.getId())
                .duration(session.getDuration())
                .sessionDate(session.getSessionDate())
                .observations(session.getObservations())
                .subjectId(session.getSubject().getId())
                .subjectName(session.getSubject().getSubjectName())
                .subjectColor(session.getSubject().getColor())
                .build();
    }

    public void updateEntityFromDTO(StudySession session, StudySessionRequestDTO dto, Subject newSubject) {
        session.setDuration(dto.getDuration());
        session.setSessionDate(dto.getSessionDate());
        session.setObservations(dto.getObservations());
        session.setSubject(newSubject);
    }
}
