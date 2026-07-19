package com.studyplatform.session.dto;
import com.studyplatform.session.StudySession;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de entrada para criação e atualização de StudySession.
 *
 * O subjectId é obrigatório — toda sessão precisa estar vinculada
 * a uma matéria. O Service valida que a matéria pertence ao usuário.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudySessionRequestDTO {

    /**
     * Duração em minutos. Mínimo de 1 minuto para evitar sessões inválidas.
     * Máximo de 1440 minutos (24 horas) como proteção contra dados absurdos.
     */
    @NotNull(message = "A duração é obrigatória")
    @Min(value = 1, message = "A duração mínima é de 1 minuto")
    @Max(value = 1440, message = "A duração máxima é de 1440 minutos (24 horas)")
    private Integer duration;

    @NotNull(message = "A data da sessão é obrigatória")
    private LocalDate sessionDate;

    @Size(max = 1000, message = "As observações devem ter no máximo 1000 caracteres")
    private String observations;

    /**
     * Id da matéria à qual esta sessão pertence.
     * O Service valida que esta matéria pertence ao usuário autenticado.
     */
    @NotNull(message = "O id da matéria é obrigatório")
    private Long subjectId;
}
