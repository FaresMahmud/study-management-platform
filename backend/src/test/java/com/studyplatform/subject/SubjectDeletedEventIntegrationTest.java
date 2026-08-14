package com.studyplatform.subject;

import com.studyplatform.goal.Goal;
import com.studyplatform.goal.GoalRepository;
import com.studyplatform.session.StudySession;
import com.studyplatform.session.StudySessionRepository;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("SubjectDeletedEvent — Teste de Integração (Goals & Sessions)")
public class SubjectDeletedEventIntegrationTest {

    @Autowired
    private SubjectService subjectService;

    @Autowired
    private SubjectRepository subjectRepository;

    @SpyBean
    private GoalRepository goalRepository;

    @SpyBean
    private StudySessionRepository studySessionRepository;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private com.studyplatform.shared.security.SecurityService securityService;

    private User user;
    private Subject subject;

    @BeforeEach
    void setUp() {
        // Limpar repositórios para evitar poluição
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

        // Stub do SecurityService para retornar o usuário autenticado de teste
        when(securityService.getAuthenticatedUser()).thenReturn(user);

        subject = Subject.builder()
                .subjectName("Biologia")
                .subjectDescription("Estudo dos seres vivos")
                .color(new Color("#00FF00"))
                .user(user)
                .build();
        subject = subjectRepository.save(subject);
    }

    @Test
    @DisplayName("A exclusão de Subject deve limpar de forma síncrona/transacional todas as metas e sessões vinculadas")
    void testSubjectDeletionCleansGoalsAndSessionsSuccessfully() {
        // ARRANGE - Criar metas associadas
        Goal goal = Goal.builder()
                .title("Aprender genética")
                .targetMastery(80)
                .currentMastery(20)
                .startDateGoal(LocalDate.now())
                .endDateGoal(LocalDate.now().plusMonths(1))
                .user(user)
                .subject(subject)
                .build();
        goalRepository.save(goal);

        // ARRANGE - Criar sessões de estudo associadas
        StudySession session = StudySession.builder()
                .duration(60)
                .sessionDate(LocalDate.now())
                .observations("Revisão de Biologia Celular")
                .subject(subject)
                .build();
        studySessionRepository.save(session);

        // ACT
        subjectService.delete(subject.getId());

        // ASSERT - Subject foi removido
        Optional<Subject> deletedSubject = subjectRepository.findById(subject.getId());
        assertThat(deletedSubject).isEmpty();

        // ASSERT - Metas foram limpas
        List<Goal> associatedGoals = goalRepository.findBySubjectId(subject.getId());
        assertThat(associatedGoals).isEmpty();

        // ASSERT - Sessões foram limpas
        List<StudySession> associatedSessions = studySessionRepository.findBySubjectId(subject.getId());
        assertThat(associatedSessions).isEmpty();
    }

    @Test
    @DisplayName("Uma exceção lançada no listener de limpeza de Goals deve causar rollback total (Subject e Sessions permanecem)")
    void testSubjectDeletionRollbackOnGoalListenerException() {
        // ARRANGE
        Goal goal = Goal.builder()
                .title("Aprender evolução")
                .targetMastery(70)
                .currentMastery(30)
                .startDateGoal(LocalDate.now())
                .endDateGoal(LocalDate.now().plusMonths(1))
                .user(user)
                .subject(subject)
                .build();
        goalRepository.save(goal);

        StudySession session = StudySession.builder()
                .duration(90)
                .sessionDate(LocalDate.now())
                .subject(subject)
                .build();
        studySessionRepository.save(session);

        // Força uma falha no processamento do listener de metas
        doThrow(new RuntimeException("Simulated database failure during goal listener clean-up"))
                .when(goalRepository).deleteAll(anyList());

        // ACT & ASSERT
        assertThatThrownBy(() -> subjectService.delete(subject.getId()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Simulated database failure during goal listener clean-up");

        // O Subject deve continuar persistido na base de dados devido ao rollback
        Optional<Subject> rolledBackSubject = subjectRepository.findById(subject.getId());
        assertThat(rolledBackSubject).isPresent();

        // As metas e sessões devem continuar salvas
        assertThat(goalRepository.findBySubjectId(subject.getId())).isNotEmpty();
        assertThat(studySessionRepository.findBySubjectId(subject.getId())).isNotEmpty();
    }

    @Test
    @DisplayName("Uma exceção lançada no listener de limpeza de Sessions deve causar rollback total (Subject e Goals permanecem)")
    void testSubjectDeletionRollbackOnSessionListenerException() {
        // ARRANGE
        Goal goal = Goal.builder()
                .title("Aprender botânica")
                .targetMastery(90)
                .currentMastery(10)
                .startDateGoal(LocalDate.now())
                .endDateGoal(LocalDate.now().plusMonths(1))
                .user(user)
                .subject(subject)
                .build();
        goalRepository.save(goal);

        StudySession session = StudySession.builder()
                .duration(45)
                .sessionDate(LocalDate.now())
                .subject(subject)
                .build();
        studySessionRepository.save(session);

        // Força uma falha no processamento do listener de sessões de estudo
        doThrow(new RuntimeException("Simulated database failure during session listener clean-up"))
                .when(studySessionRepository).deleteAll(anyList());

        // ACT & ASSERT
        assertThatThrownBy(() -> subjectService.delete(subject.getId()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Simulated database failure during session listener clean-up");

        // O Subject deve continuar persistido na base de dados devido ao rollback
        Optional<Subject> rolledBackSubject = subjectRepository.findById(subject.getId());
        assertThat(rolledBackSubject).isPresent();

        // As metas e sessões devem continuar salvas
        assertThat(goalRepository.findBySubjectId(subject.getId())).isNotEmpty();
        assertThat(studySessionRepository.findBySubjectId(subject.getId())).isNotEmpty();
    }
}
