package com.studyplatform.ai;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplatform.shared.exception.BusinessException;

import lombok.extern.slf4j.Slf4j;

/**
 * Serviço de integração com a Nvidia NIM API (compatível com OpenAI).
 * Usa o endpoint https://integrate.api.nvidia.com/v1/chat/completions.
 * Suporta modelos como meta/llama-3.1-8b-instruct, nvidia/nemotron-4-340b-instruct, etc.
 */
@Slf4j
@Service
public class NvidiaNimService implements TextGenerationProvider {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${nvidia.api.key:}")
    private String nvidiaApiKey;

    @Value("${nvidia.model:meta/llama-3.1-8b-instruct}")
    private String nvidiaModel;

    public NvidiaNimService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return nvidiaApiKey != null && !nvidiaApiKey.trim().isEmpty()
                && !nvidiaApiKey.equals("SUA_CHAVE_NVIDIA_AQUI");
    }

    public String getNvidiaModel() {
        return nvidiaModel;
    }

    /**
     * Gera conteúdo usando a API de chat completion da Nvidia NIM.
     * Formato compatível com OpenAI.
     */
    @Override
    public String generateContent(String prompt) throws IOException, InterruptedException {
        if (!isConfigured()) {
            throw new IllegalStateException("Chave de API da Nvidia não configurada.");
        }

        Map<String, Object> requestBody = Map.of(
                "model", nvidiaModel,
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)
                ),
                "max_tokens", 4096,
                "temperature", 0.7
        );

        String jsonPayload = objectMapper.writeValueAsString(requestBody);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://integrate.api.nvidia.com/v1/chat/completions"))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + nvidiaApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        log.info("Enviando requisição para a API Nvidia NIM (modelo: {})...", nvidiaModel);
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new BusinessException("Erro na resposta da API Nvidia: HTTP " + response.statusCode()
                    + " - " + response.body());
        }

        // Faz o parsing da resposta no formato OpenAI
        Map<String, Object> responseMap = objectMapper.readValue(response.body(), Map.class);
        List<Map<String, Object>> choices = (List<Map<String, Object>>) responseMap.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new BusinessException("Nenhuma resposta retornada pela API Nvidia.");
        }

        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        if (message == null || message.get("content") == null) {
            throw new BusinessException("Conteúdo vazio retornado pela API Nvidia.");
        }

        String rawText = ((String) message.get("content")).trim();

        // Limpa blocos de código markdown se o modelo ignorou a regra de resposta limpa
        String cleanJson = rawText;
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
}
