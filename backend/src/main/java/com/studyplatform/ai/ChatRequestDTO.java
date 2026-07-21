package com.studyplatform.ai;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de requisição para fazer uma pergunta ao tutor inteligente contextualizado.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequestDTO {
    private Long examPrepId;
    private String question;
}
