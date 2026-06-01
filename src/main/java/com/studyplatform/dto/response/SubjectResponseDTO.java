package com.studyplatform.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de saída para Subject.
 *
 * Retornamos o userId e userName do dono para que o frontend
 * saiba a quem a matéria pertence sem expor o objeto User completo.
 *
 * Nunca retornamos as listas de sessions e goals aqui
 * para evitar respostas pesadas — o frontend busca quando precisar.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectResponseDTO {

    private Long id;
    private String subjectName;
    private String subjectDescription;
    private String color;

    // Dados mínimos do dono — sem expor objeto User inteiro
    private Long userId;
    private String userName;
}
