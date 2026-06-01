package com.studyplatform.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

// Representa uma matéria/área de estudo do usuário.
// Ao deletar um Subject, o Cascade garante que todas as sessões e metas vinculadas também somem.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "subjects")
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subjectName", nullable = false)
    private String subjectName;

    @Column(name = "subjectDescription", columnDefinition = "TEXT")
    private String subjectDescription;

    // Cor hexadecimal pra identificar visualmente a matéria no frontend (ex: "#FF5733")
    @Column(name = "color")
    private String color;

    // Dono da matéria. LAZY pra não trazer o User em toda query de Subject.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<StudySession> studySessions = new ArrayList<>();

    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Goal> goals = new ArrayList<>();
}
