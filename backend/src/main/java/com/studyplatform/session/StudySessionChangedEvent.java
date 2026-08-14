package com.studyplatform.session;

import java.time.LocalDate;

/**
 * Evento disparado síncronamente quando uma sessão de estudo é criada, alterada ou excluída.
 * Permite que o domínio de metas (Goals) recalcule o progresso sem acoplar diretamente.
 */
public record StudySessionChangedEvent(Long userId, LocalDate sessionDate) {
}
