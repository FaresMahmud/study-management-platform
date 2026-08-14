package com.studyplatform.session;

import com.studyplatform.goal.Goal;
import com.studyplatform.goal.GoalRepository;
import com.studyplatform.session.dto.StudySessionRequestDTO;
import com.studyplatform.subject.Color;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectRepository;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("StudySessionChangedEvent — Teste de Integração (Recalcular Metas)")
public class StudySessionChangedEventIntegrationTest {

    @Autowired
    private StudySessionService studySessionService;

    @Autowired
    private StudySessionRepository studySessionRepository;

    @SpyBean
    private GoalRepository goalRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private com.studyplatform.shared.security.SecurityService securityService;

    private User user;
    private Subject subject;
    private Goal studyGoal;

    @BeforeEach
    void setUp() {
        studySessionRepository.deleteAll();
        goalRepository.deleteAll();
        subjectRepository.deleteAll();
        userRepository.deleteAll();

        user = User.builder()
                .nameUser("User Test")
                .email("test@email.com")
                .passwordUser("password")
                .build();
        user = userRepository.save(user);

        when(securityService.getAuthenticatedUser()).thenReturn(user);

        subject = Subject.builder()
                .subjectName("História")
                .subjectDescription("História Geral")
                .color(new Color("#FF9900"))
                .user(user)
                .build();
        subject = subjectRepository.save(subject);

        // Meta: 10 horas de estudo (1 hora = 10% de maestria, então 10 horas = 100% de maestria)
        studyGoal = Goal.builder()
                .title("Meta de Histórias")
                .targetMastery(100)
                .currentMastery(0)
                .startDateGoal(LocalDate.now())
                .endDateGoal(LocalDate.now().plusDays(2))
                .user(user)
                .subject(subject)
                .build();
        studyGoal = goalRepository.save(studyGoal);
    }

    @Test
    @DisplayName("Criar uma StudySession deve disparar o evento síncrono e recalcular o progresso da Goal")
    void testCreateStudySessionRecalculatesGoalProgress() {
        // ARRANGE
        StudySessionRequestDTO request = StudySessionRequestDTO.builder()
                .duration(120) // 2 horas (deve atualizar a maestria para 20%)
                .sessionDate(LocalDate.now())
                .observations("Estudei Revolução Francesa")
                .subjectId(subject.getId())
                .build();

        // ACT
        studySessionService.create(request);

        // ASSERT
        Goal updatedGoal = goalRepository.findById(studyGoal.getId()).orElseThrow();
        assertThat(updatedGoal.getCurrentMastery()).isEqualTo(20);
    }

    @Test
    @DisplayName("Editar uma StudySession deve atualizar a Goal correspondente")
    void testUpdateStudySessionRecalculatesGoalProgress() {
        // ARRANGE - Cria uma sessão com 180 min (3 horas)
        StudySession session = StudySession.builder()
                .duration(180)
                .sessionDate(LocalDate.now())
                .subject(subject)
                .build();
        session = studySessionRepository.save(session);

        // Força recálculo inicial
        studySessionService.create(StudySessionRequestDTO.builder()
                .duration(60) // Adiciona outra de 1 hora
                .sessionDate(LocalDate.now())
                .subjectId(subject.getId())
                .build());

        // ACT - Edita a primeira sessão de 3 horas para 5 horas (300 min)
        StudySessionRequestDTO updateRequest = StudySessionRequestDTO.builder()
                .duration(300)
                .sessionDate(LocalDate.now())
                .subjectId(subject.getId())
                .build();
        studySessionService.update(session.getId(), updateRequest);

        // ASSERT - Total agora: 5 horas + 1 hora = 6 horas (60% de maestria)
        Goal updatedGoal = goalRepository.findById(studyGoal.getId()).orElseThrow();
        assertThat(updatedGoal.getCurrentMastery()).isEqualTo(60);
    }

    @Test
    @DisplayName("Deletar uma StudySession deve subtrair o tempo do progresso da Goal")
    void testDeleteStudySessionRecalculatesGoalProgress() {
        // ARRANGE
        StudySession session = StudySession.builder()
                .duration(120) // 2 horas
                .sessionDate(LocalDate.now())
                .subject(subject)
                .build();
        session = studySessionRepository.save(session);

        // Dispara recálculo
        studySessionService.create(StudySessionRequestDTO.builder()
                .duration(120) // + 2 horas = 4 horas
                .sessionDate(LocalDate.now())
                .subjectId(subject.getId())
                .build());

        // ACT - Deleta a primeira sessão de 2 horas
        studySessionService.delete(session.getId());

        // ASSERT - Deve sobrar apenas a outra sessão de 2 horas (20% de maestria)
        Goal updatedGoal = goalRepository.findById(studyGoal.getId()).orElseThrow();
        assertThat(updatedGoal.getCurrentMastery()).isEqualTo(20);
    }

    @Test
    @DisplayName("Falha ao salvar a Goal atualizada pelo EventListener deve forçar o rollback da criação da StudySession")
    void testRollbackOnGoalRecalculationListenerFailure() {
        // ARRANGE
        StudySessionRequestDTO request = StudySessionRequestDTO.builder()
                .duration(180)
                .sessionDate(LocalDate.now())
                .subjectId(subject.getId())
                .build();

        // Configura espionagem para forçar falha no repositório de metas durante o salvamento
        doThrow(new RuntimeException("Simulated goal save database error"))
                .when(goalRepository).save(any(Goal.class));

        // ACT & ASSERT
        assertThatThrownBy(() -> studySessionService.create(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Simulated goal save database error");

        // A sessão de estudo NÃO deve ter sido salva (rollback completo)
        List<StudySession> sessions = studySessionRepository.findBySubjectId(subject.getId());
        assertThat(sessions).isEmpty();
    }
}
