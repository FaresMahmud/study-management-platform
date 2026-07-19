package com.studyplatform.session;
import com.studyplatform.session.StudySession;
import com.studyplatform.session.dto.StudySessionRequestDTO;
import com.studyplatform.session.dto.StudySessionResponseDTO;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StudySessionMapper {

    private final SubjectMapper subjectMapper;

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
                .subject(session.getSubject() != null ? subjectMapper.toResponseDTO(session.getSubject()) : null)
                .build();
    }

    public void updateEntityFromDTO(StudySession session, StudySessionRequestDTO dto, Subject newSubject) {
        session.setDuration(dto.getDuration());
        session.setSessionDate(dto.getSessionDate());
        session.setObservations(dto.getObservations());
        session.setSubject(newSubject);
    }
}
