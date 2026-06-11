package com.studyplatform.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

// Representa uma meta de estudo. O Subject é opcional:
// o usuário pode criar metas gerais (ex: "estudar 100h no mês") sem vincular a uma matéria.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "goals")
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    // Horas já estudadas — começa em 0 e é atualizado conforme o usuário avança
    @Column(name = "progress", nullable = false)
    private Double progress;

    // Quantidade de horas que o usuário quer atingir
    @Column(name = "objectiveHours", nullable = false)
    private Double objectiveHours;

    @Column(name = "startDateGoal", nullable = false)
    private LocalDate startDateGoal;

    @Column(name = "endDateGoal", nullable = false)
    private LocalDate endDateGoal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Subject opcional — nullable = true é o padrão, mas deixamos explícito pra ficar claro
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = true)
    private Subject subject;
}
