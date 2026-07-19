package com.studyplatform.subject;
import jakarta.persistence.Embeddable;
import java.io.Serializable;

/**
 * Objeto de Valor (Value Object) que representa uma cor no sistema.
 * Garante que a cor esteja em formato hexadecimal válido.
 */
@Embeddable
public record Color(String value) implements Serializable {
    public Color {
        if (value != null && !value.isBlank()) {
            if (!value.matches("^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$")) {
                throw new IllegalArgumentException("Código de cor hexadecimal inválido: " + value);
            }
        }
    }
}
