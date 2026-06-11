package com.studyplatform.service;

import com.studyplatform.dto.response.GoalResponseDTO;
import com.studyplatform.entity.Goal;
import com.studyplatform.entity.Subject;
import com.studyplatform.entity.User;
import com.studyplatform.mapper.GoalMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testes unitários do GoalMapper.
 *
 * Focamos especialmente no cálculo do completionPercentage
 * pois é lógica de negócio dentro do mapper.
 */
@DisplayName("GoalMapper — Testes Unitários")
class GoalMapperTest {

    private GoalMapper goalMapper;
    private User user;
    private Subject subject;

    @BeforeEach
    void setUp() {
        goalMapper = new GoalMapper();

        user = User.builder()
                .id(1L).nameUser("João").email("joao@email.com").build();

        subject = Subject.builder()
                .id(1L).subjectName("Matemática").user(user).build();
    }

    private Goal buildGoal(Double progress, Double objective, Subject sub) {
        return Goal.builder()
                .id(1L).title("Meta Teste")
                .progress(progress).objectiveHours(objective)
                .startDateGoal(LocalDate.now())
                .endDateGoal(LocalDate.now().plusMonths(1))
                .user(user).subject(sub)
                .build();
    }

    @Test
    @DisplayName("toResponseDTO → calcula 50% quando progress é metade do objetivo")
    void toResponseDTO_halfProgress_returns50Percent() {
        // ARRANGE
        Goal goal = buildGoal(25.0, 50.0, subject);

        // ACT
        GoalResponseDTO dto = goalMapper.toResponseDTO(goal);

        // ASSERT
        assertThat(dto.getCompletionPercentage()).isEqualTo(50.0);
    }

    @Test
    @DisplayName("toResponseDTO → calcula 100% quando progress iguala o objetivo")
    void toResponseDTO_fullProgress_returns100Percent() {
        Goal goal = buildGoal(50.0, 50.0, subject);
        GoalResponseDTO dto = goalMapper.toResponseDTO(goal);
        assertThat(dto.getCompletionPercentage()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("toResponseDTO → limita a 100% mesmo quando progress ultrapassa objetivo")
    void toResponseDTO_progressExceedsObjective_capsAt100Percent() {
        // ARRANGE — progresso maior que o objetivo (possível em atualizações)
        Goal goal = buildGoal(60.0, 50.0, subject);

        // ACT
        GoalResponseDTO dto = goalMapper.toResponseDTO(goal);

        // ASSERT — nunca ultrapassa 100%
        assertThat(dto.getCompletionPercentage()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("toResponseDTO → retorna 0% quando progress é zero")
    void toResponseDTO_zeroProgress_returns0Percent() {
        Goal goal = buildGoal(0.0, 50.0, subject);
        GoalResponseDTO dto = goalMapper.toResponseDTO(goal);
        assertThat(dto.getCompletionPercentage()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("toResponseDTO → subjectId e subjectName são null quando subject é null")
    void toResponseDTO_nullSubject_returnsNullSubjectFields() {
        // ARRANGE — meta geral sem subject
        Goal goal = buildGoal(10.0, 50.0, null);

        // ACT
        GoalResponseDTO dto = goalMapper.toResponseDTO(goal);

        // ASSERT — campos de subject devem ser null, não lançar NullPointerException
        assertThat(dto.getSubjectId()).isNull();
        assertThat(dto.getSubjectName()).isNull();
    }

    @Test
    @DisplayName("toResponseDTO → inclui dados do subject quando subject não é null")
    void toResponseDTO_withSubject_returnsSubjectData() {
        Goal goal = buildGoal(10.0, 50.0, subject);
        GoalResponseDTO dto = goalMapper.toResponseDTO(goal);

        assertThat(dto.getSubjectId()).isEqualTo(1L);
        assertThat(dto.getSubjectName()).isEqualTo("Matemática");
    }
}
