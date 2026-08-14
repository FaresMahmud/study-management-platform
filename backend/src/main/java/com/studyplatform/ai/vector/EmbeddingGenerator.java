package com.studyplatform.ai.vector;

import java.util.List;

/**
 * Interface para inverter a dependência entre o serviço de vetores e o cliente concreto de IA.
 */
public interface EmbeddingGenerator {
    boolean isConfigured();
    List<Double> getEmbedding(String text) throws Exception;
}
