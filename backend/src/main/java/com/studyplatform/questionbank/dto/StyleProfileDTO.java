package com.studyplatform.questionbank.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StyleProfileDTO {
    @JsonProperty("fonte_detectada")
    private String fonteDetectada;

    @JsonProperty("formato")
    private String formato;

    @JsonProperty("comando_padrao")
    private String comandoPadrao;

    @JsonProperty("estilo_enunciado")
    private String estiloEnunciado;

    @JsonProperty("dificuldade_media")
    private String dificuldadeMedia;

    @JsonProperty("padroes_observados")
    private List<String> padroesObservados;
}
