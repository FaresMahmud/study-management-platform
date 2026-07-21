package com.studyplatform.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplatform.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiService {

    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    public boolean isConfigured() {
        return geminiApiKey != null && !geminiApiKey.trim().isEmpty() && !geminiApiKey.equals("SUA_CHAVE_GEMINI_AQUI");
    }

    public String generateContent(String prompt) throws IOException, InterruptedException {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty() || geminiApiKey.equals("SUA_CHAVE_GEMINI_AQUI")) {
            throw new IllegalStateException("Chave de API do Gemini não configurada.");
        }

        // Cria o payload para o Gemini 1.5 Flash (modelo estável e rápido)
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                )
        );

        String jsonPayload = objectMapper.writeValueAsString(requestBody);

        HttpClient client = HttpClient.newHttpClient();
        URI uri = URI.create("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        log.info("Enviando requisição para a API Gemini...");
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new BusinessException("Erro na resposta da API Gemini: HTTP " + response.statusCode());
        }

        // Faz o parsing da resposta do Gemini
        Map<String, Object> responseMap = objectMapper.readValue(response.body(), Map.class);
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new BusinessException("Nenhum candidato retornado pelo Gemini.");
        }

        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        if (parts == null || parts.isEmpty()) {
            throw new BusinessException("Nenhuma parte de texto retornada pelo Gemini.");
        }

        String rawText = (String) parts.get(0).get("text");
        
        // Limpa blocos de código markdown se o modelo ignorou a regra de resposta limpa
        String cleanJson = rawText.trim();
        if (cleanJson.startsWith("```json")) {
            cleanJson = cleanJson.substring(7);
        } else if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.substring(3);
        }
        if (cleanJson.endsWith("```")) {
            cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
        }
        return cleanJson.trim();
    }

    public List<Double> getEmbedding(String text) throws IOException, InterruptedException {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty() || geminiApiKey.equals("SUA_CHAVE_GEMINI_AQUI")) {
            throw new IllegalStateException("Chave de API do Gemini não configurada.");
        }

        Map<String, Object> requestBody = Map.of(
                "model", "models/text-embedding-004",
                "content", Map.of("parts", List.of(
                        Map.of("text", text)
                ))
        );

        String jsonPayload = objectMapper.writeValueAsString(requestBody);

        HttpClient client = HttpClient.newHttpClient();
        URI uri = URI.create("https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=" + geminiApiKey);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new BusinessException("Erro ao obter embedding do Gemini: HTTP " + response.statusCode());
        }

        Map<String, Object> responseMap = objectMapper.readValue(response.body(), Map.class);
        Map<String, Object> embedding = (Map<String, Object>) responseMap.get("embedding");
        if (embedding == null) {
            throw new BusinessException("Nenhum embedding retornado pelo Gemini.");
        }

        return (List<Double>) embedding.get("values");
    }
}
