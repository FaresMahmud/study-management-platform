package com.studyplatform.goal;
import com.studyplatform.goal.Goal;
import com.studyplatform.goal.GoalMapper;
import com.studyplatform.goal.GoalRepository;
import com.studyplatform.goal.GoalService;
import com.studyplatform.goal.dto.GoalRequestDTO;
import com.studyplatform.goal.dto.GoalResponseDTO;
import com.studyplatform.session.StudySessionRepository;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectRepository;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("GoalService — Testes Unitários")
class GoalServiceTest {

    @Mock private GoalRepository goalRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private UserRepository userRepository;
    @Mock private GoalMapper goalMapper;
    @Mock private StudySessionRepository studySessionRepository;
    @Mock private SecurityContext securityContext;
    @Mock private Authentication authentication;

    @InjectMocks
    private GoalService goalService;

    private User authenticatedUser;
    private Subject subject;
    private Goal goal;
    private GoalRequestDTO validRequest;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("joao@email.com");

        authenticatedUser = User.builder()
                .id(1L).nameUser("João").email("joao@email.com").build();

        subject = Subject.builder()
                .id(1L).subjectName("Matemática").user(authenticatedUser).build();

        goal = Goal.builder()
                .id(1L).title("Meta Matemática")
                .progress(10.0).objectiveHours(50.0)
                .startDateGoal(LocalDate.now())
                .endDateGoal(LocalDate.now().plusMonths(1))
                .user(authenticatedUser).subject(subject)
                .build();

        validRequest = GoalRequestDTO.builder()
                .title("Meta Matemática")
                .progress(10.0).objectiveHours(50.0)
                .startDateGoal(LocalDate.now())
                .endDateGoal(LocalDate.now().plusMonths(1))
                .subjectId(1L)
                .build();

        lenient().when(studySessionRepository.sumDurationBySubjectAndPeriod(any(), any(), any(), any())).thenReturn(600);
        lenient().when(studySessionRepository.sumDurationByUserAndPeriod(any(), any(), any())).thenReturn(600);

        when(userRepository.findByEmail("joao@email.com"))
                .thenReturn(Optional.of(authenticatedUser));
    }

    // ==================== TESTES DE CRIAÇÃO ====================

    @Test
    @DisplayName("create → cria goal com subject quando subjectId é informado")
    void create_withSubject_savesGoalWithSubject() {
        // ARRANGE
        when(subjectRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(subject));
        when(goalMapper.toEntity(validRequest, authenticatedUser, subject)).thenReturn(goal);
        when(goalRepository.save(goal)).thenReturn(goal);
        when(goalMapper.toResponseDTO(goal)).thenReturn(new GoalResponseDTO());

        // ACT
        goalService.create(validRequest);

        // ASSERT — Subject foi buscado e passado ao mapper
        verify(subjectRepository).findByIdAndUserId(1L, 1L);
        verify(goalMapper).toEntity(validRequest, authenticatedUser, subject);
        verify(goalRepository).save(any(Goal.class));
    }

    @Test
    @DisplayName("create → cria goal sem subject quando subjectId é null")
    void create_withoutSubject_savesGoalWithNullSubject() {
        // ARRANGE — request sem subjectId
        GoalRequestDTO requestWithoutSubject = GoalRequestDTO.builder()
                .title("Meta Geral")
                .progress(0.0).objectiveHours(100.0)
                .startDateGoal(LocalDate.now())
                .endDateGoal(LocalDate.now().plusMonths(3))
                .subjectId(null) // meta geral
                .build();

        when(goalMapper.toEntity(requestWithoutSubject, authenticatedUser, null)).thenReturn(goal);
        when(goalRepository.save(goal)).thenReturn(goal);
        when(goalMapper.toResponseDTO(goal)).thenReturn(new GoalResponseDTO());

        // ACT
        goalService.create(requestWithoutSubject);

        // ASSERT — SubjectRepository nunca foi consultado
        verify(subjectRepository, never()).findByIdAndUserId(anyLong(), anyLong());
        verify(goalMapper).toEntity(requestWithoutSubject, authenticatedUser, null);
    }

    // ==================== TESTES DE VALIDAÇÃO ====================

    @Test
    @DisplayName("create → lança BusinessException quando data de fim é antes do início")
    void create_endDateBeforeStartDate_throwsBusinessException() {
        // ARRANGE — data de fim anterior à data de início
        GoalRequestDTO invalidRequest = GoalRequestDTO.builder()
                .title("Meta Inválida")
                .progress(0.0).objectiveHours(50.0)
                .startDateGoal(LocalDate.now().plusDays(10))
                .endDateGoal(LocalDate.now()) // fim antes do início
                .build();

        // ACT & ASSERT
        assertThatThrownBy(() -> goalService.create(invalidRequest))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("data de término");

        verify(goalRepository, never()).save(any());
    }



    // ==================== TESTES DE BUSCA ====================

    @Test
    @DisplayName("findById → lança ResourceNotFoundException quando goal não existe")
    void findById_nonExistentGoal_throwsResourceNotFoundException() {
        // ARRANGE
        when(goalRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.empty());

        // ACT & ASSERT
        assertThatThrownBy(() -> goalService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    // ==================== TESTES DE DELEÇÃO ====================

    @Test
    @DisplayName("delete → deleta goal com sucesso")
    void delete_ownGoal_deletesSuccessfully() {
        // ARRANGE
        when(goalRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(goal));

        // ACT
        goalService.delete(1L);

        // ASSERT
        verify(goalRepository).delete(goal);
    }
}
