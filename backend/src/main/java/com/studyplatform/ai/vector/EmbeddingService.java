package com.studyplatform.ai.vector;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Serviço responsável por obter os embeddings de textos.
 * Suporta o modelo de embeddings OpenAI e fallback offline determinístico.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final ObjectMapper objectMapper;

    @Value("${openai.api.key:}")
    private String openaiApiKey;

    @Value("${openai.embedding.model:text-embedding-3-small}")
    private String modelName;

    public boolean isConfigured() {
        return openaiApiKey != null && !openaiApiKey.trim().isEmpty() && !openaiApiKey.equals("SUA_CHAVE_OPENAI_AQUI");
    }

    public List<Double> getEmbedding(String text) {
        if (!isConfigured()) {
            log.debug("OpenAI API Key não configurada. Usando embeddings locais determinísticos de mock.");
            return generateMockEmbedding(text);
        }

        try {
            Map<String, Object> requestBody = Map.of(
                    "model", modelName,
                    "input", text
            );

            String jsonPayload = objectMapper.writeValueAsString(requestBody);

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(8))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/embeddings"))
                    .timeout(Duration.ofSeconds(12))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + openaiApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Erro ao chamar API da OpenAI: HTTP {}. Response: {}", response.statusCode(), response.body());
                return generateMockEmbedding(text);
            }

            Map<String, Object> responseMap = objectMapper.readValue(response.body(), Map.class);
            List<Map<String, Object>> dataList = (List<Map<String, Object>>) responseMap.get("data");
            if (dataList == null || dataList.isEmpty()) {
                throw new IllegalStateException("Nenhum dado retornado no response de embeddings");
            }

            List<Number> embeddingNumbers = (List<Number>) dataList.get(0).get("embedding");
            List<Double> embedding = new ArrayList<>(embeddingNumbers.size());
            for (Number num : embeddingNumbers) {
                embedding.add(num.doubleValue());
            }

            return embedding;
        } catch (Exception e) {
            log.error("Falha ao obter embedding da OpenAI. Fazendo fallback para mock local.", e);
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
