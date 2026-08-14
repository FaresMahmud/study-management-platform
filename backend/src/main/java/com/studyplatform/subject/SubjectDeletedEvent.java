package com.studyplatform.subject;

/**
 * Evento disparado síncronamente quando uma matéria (Subject) é excluída do sistema.
 * Permite que outros domínios (como metas/goals e sessões/sessions) limpem seus dados.
 */
public record SubjectDeletedEvent(Long subjectId) {
}
