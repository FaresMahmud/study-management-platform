package com.studyplatform.examprep;

/**
 * Interface para inverter a dependência entre a geração de simulados e o cliente de IA concreto.
 */
public interface QuestionGenerator {
    boolean isConfigured();
    String generateContent(String prompt) throws Exception;
}
