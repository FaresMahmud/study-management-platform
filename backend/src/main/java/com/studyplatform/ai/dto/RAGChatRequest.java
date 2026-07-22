package com.studyplatform.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RAGChatRequest {
    @NotNull(message = "O ID do preparatório não pode ser nulo.")
    private Long examPrepId;

    @NotBlank(message = "A pergunta não pode ser vazia.")
    private String question;
}
