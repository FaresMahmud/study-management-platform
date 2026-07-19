package com.studyplatform.flashcard.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlashcardRequestDTO {

    @NotBlank(message = "A pergunta/frente do cartão é obrigatória")
    private String front;

    @NotBlank(message = "A resposta/verso do cartão é obrigatória")
    private String back;

    @NotNull(message = "A matéria associada é obrigatória")
    private Long subjectId;

    private Long summaryId;
}
