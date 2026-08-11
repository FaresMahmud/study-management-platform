package com.studyplatform.ai.vector;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.springframework.stereotype.Service;

import com.studyplatform.ai.GeminiService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Serviço responsável por obter os embeddings de textos.
 * Usa Gemini como provedor principal e mantém fallback offline determinístico.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final GeminiService geminiService;

    public boolean isConfigured() {
        return geminiService.isConfigured();
    }

    public List<Double> getEmbedding(String text) {
        if (!isConfigured()) {
            log.debug("Chave do Gemini não configurada. Usando embeddings locais determinísticos de mock.");
            return generateMockEmbedding(text);
        }

        try {
            return geminiService.getEmbedding(text);
        } catch (Exception e) {
            log.error("Falha ao obter embedding do Gemini. Fazendo fallback para mock local.", e);
            return generateMockEmbedding(text);
        }
    }

    private List<Double> generateMockEmbedding(String text) {
        List<Double> vector = new ArrayList<>(1536);
        long seed = text != null ? text.hashCode() : 0L;
        Random rand = new Random(seed);
        double sum = 0.0;
        for (int i = 0; i < 1536; i++) {
            double val = rand.nextGaussian();
            vector.add(val);
            sum += val * val;
        }
        double norm = Math.sqrt(sum);
        for (int i = 0; i < 1536; i++) {
            vector.set(i, vector.get(i) / (norm > 0 ? norm : 1.0));
        }
        return vector;
    }
}
