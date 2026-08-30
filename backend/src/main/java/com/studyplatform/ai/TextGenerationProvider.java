package com.studyplatform.ai;

import com.studyplatform.examprep.QuestionGenerator;

/**
 * Interface de abstração para provedores de geração de texto por IA.
 * Estende QuestionGenerator (isConfigured + generateContent) servindo como
 * marker interface para distinguir semanticamente geração de texto de
 * outras funcionalidades de IA (embeddings, multimodal, etc.).
 *
 * Implementações: GeminiService, NvidiaNimService.
 */
public interface TextGenerationProvider extends QuestionGenerator {
    // Herda de QuestionGenerator:
    // - boolean isConfigured()
    // - String generateContent(String prompt) throws Exception
}
