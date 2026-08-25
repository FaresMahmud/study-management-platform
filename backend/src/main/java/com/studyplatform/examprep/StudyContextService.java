package com.studyplatform.examprep;

/**
 * Interface para inverter a dependência entre a preparação de simulados e o processamento
 * de arquivos/PDFs de estudo.
 */
public interface StudyContextService {
    String getContextTextForExamPrep(Long examPrepId);
    boolean hasContextForExamPrep(Long examPrepId);
}
