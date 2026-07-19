package com.studyplatform.flashcard;
import jakarta.persistence.Embeddable;
import java.io.Serializable;

/**
 * Objeto de Valor (Value Object) que representa a caixa Leitner do Flashcard.
 * Encapsula limites (1 a 5) e a lógica de agendamento de revisões.
 */
@Embeddable
public record LeitnerBox(int value) implements Serializable {
    public LeitnerBox {
        if (value < 1 || value > 5) {
            throw new IllegalArgumentException("A caixa Leitner deve estar entre 1 e 5");
        }
    }

    public static LeitnerBox initial() {
        return new LeitnerBox(1);
    }

    public LeitnerBox next(String quality) {
        if ("easy".equalsIgnoreCase(quality) || "good".equalsIgnoreCase(quality)) {
            return new LeitnerBox(Math.min(5, value + 1));
        } else {
            return new LeitnerBox(1);
        }
    }

    public int getIntervalDays() {
        return switch (value) {
            case 1 -> 1;
            case 2 -> 3;
            case 3 -> 7;
            case 4 -> 14;
            case 5 -> 30;
            default -> 1;
        };
    }
}
