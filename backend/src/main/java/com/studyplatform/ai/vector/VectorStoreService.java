package com.studyplatform.ai.vector;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplatform.file.PdfChunk;
import com.studyplatform.file.PdfChunkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

/**
 * Serviço responsável pela comunicação e gerenciamento de vetores no ChromaDB.
 * Permite salvar chunks e pesquisar similaridades de forma isolada por examPrepId.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VectorStoreService {

    private final EmbeddingService embeddingService;
    private final PdfChunkRepository pdfChunkRepository;
    private final ObjectMapper objectMapper;

    @Value("${chroma.url:http://localhost:8000}")
    private String chromaUrl;

    /**
     * Obtém ou cria uma coleção no ChromaDB baseada no examPrepId para garantir o isolamento semântico.
     * Retorna o UUID da coleção.
     */
    private String getOrCreateCollection(Long examPrepId) throws Exception {
        String collectionName = "examprep_" + examPrepId;
        Map<String, Object> requestBody = Map.of(
                "name", collectionName,
                "get_or_create", true
        );

        String jsonPayload = objectMapper.writeValueAsString(requestBody);

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(chromaUrl + "/api/v1/collections"))
                .timeout(Duration.ofSeconds(8))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200 && response.statusCode() != 201) {
            throw new RuntimeException("Erro ao obter/criar coleção ChromaDB: HTTP " + response.statusCode());
        }

        Map<String, Object> responseMap = objectMapper.readValue(response.body(), new TypeReference<>() {});
        return (String) responseMap.get("id");
    }

    /**
     * Envia em lote os chunks para indexação no ChromaDB.
     */
    public void storeChunks(List<PdfChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return;
        }

        // Agrupa os chunks por examPrepId para isolamento das coleções
        Map<Long, List<PdfChunk>> grouped = new HashMap<>();
        for (PdfChunk chunk : chunks) {
            if (chunk.getExamPrep() != null && chunk.getExamPrep().getId() != null) {
                grouped.computeIfAbsent(chunk.getExamPrep().getId(), k -> new ArrayList<>()).add(chunk);
            }
        }

        for (Map.Entry<Long, List<PdfChunk>> entry : grouped.entrySet()) {
            Long examPrepId = entry.getKey();
            List<PdfChunk> prepChunks = entry.getValue();

            try {
                String collectionUuid = getOrCreateCollection(examPrepId);

                List<String> ids = new ArrayList<>();
                List<List<Double>> embeddings = new ArrayList<>();
                List<Map<String, Object>> metadatas = new ArrayList<>();
                List<String> documents = new ArrayList<>();

                for (PdfChunk chunk : prepChunks) {
                    ids.add("chunk_" + chunk.getId());
                    embeddings.add(embeddingService.getEmbedding(chunk.getChunkText()));
                    metadatas.add(Map.of(
                            "file_id", chunk.getUploadedFile().getId(),
                            "exam_prep_id", examPrepId,
                            "chunk_index", chunk.getChunkIndex()
                    ));
                    documents.add(chunk.getChunkText());
                }

                Map<String, Object> requestBody = Map.of(
                        "ids", ids,
                        "embeddings", embeddings,
                        "metadatas", metadatas,
                        "documents", documents
                );

                String jsonPayload = objectMapper.writeValueAsString(requestBody);

                HttpClient client = HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(8))
                        .build();

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(chromaUrl + "/api/v1/collections/" + collectionUuid + "/add"))
                        .timeout(Duration.ofSeconds(12))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 200 && response.statusCode() != 201) {
                    log.error("Erro ao adicionar chunks no ChromaDB: HTTP {}. Response: {}", response.statusCode(), response.body());
                } else {
                    log.info("Sucesso na indexação vetorial. Indexados {} chunks na coleção examprep_{}", prepChunks.size(), examPrepId);
                }

            } catch (Exception e) {
                log.error("Falha ao indexar chunks no ChromaDB para examPrepId: {}. O sistema continuará operacional.", examPrepId, e);
            }
        }
    }

    /**
     * Pesquisa os chunks mais similares no ChromaDB de forma isolada por examPrepId.
     * Retorna a lista de chunks correspondentes do banco com sua respectiva distância/score de similaridade.
     */
    public List<PdfChunkSimilarity> searchSimilar(Long examPrepId, String queryText, int limit) {
        if (queryText == null || queryText.trim().isEmpty()) {
            return Collections.emptyList();
        }

        try {
            String collectionUuid = getOrCreateCollection(examPrepId);
            List<Double> queryEmbedding = embeddingService.getEmbedding(queryText);

            Map<String, Object> requestBody = Map.of(
                    "query_embeddings", List.of(queryEmbedding),
                    "n_results", limit
            );

            String jsonPayload = objectMapper.writeValueAsString(requestBody);

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(chromaUrl + "/api/v1/collections/" + collectionUuid + "/query"))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Erro na busca de similaridade no ChromaDB: HTTP {}. Response: {}", response.statusCode(), response.body());
                return fallbackSearch(examPrepId, queryText, limit);
            }

            Map<String, Object> responseMap = objectMapper.readValue(response.body(), new TypeReference<>() {});
            List<List<String>> idsList = (List<List<String>>) responseMap.get("ids");
            List<List<Double>> distancesList = (List<List<Double>>) responseMap.get("distances");

            if (idsList == null || idsList.isEmpty() || idsList.get(0).isEmpty()) {
                return Collections.emptyList();
            }

            List<String> ids = idsList.get(0);
            List<Double> distances = distancesList != null && !distancesList.isEmpty() ? distancesList.get(0) : Collections.emptyList();

            // Mapeia os ids vetoriais de volta para IDs numéricos do banco relacional
            List<Long> dbIds = new ArrayList<>();
            Map<Long, Double> distanceMap = new HashMap<>();

            for (int i = 0; i < ids.size(); i++) {
                String idStr = ids.get(i);
                if (idStr.startsWith("chunk_")) {
                    try {
                        Long id = Long.parseLong(idStr.substring(6));
                        dbIds.add(id);
                        if (i < distances.size()) {
                            distanceMap.put(id, distances.get(i));
                        }
                    } catch (NumberFormatException e) {
                        log.warn("Formato de ID vetorial inválido retornado pelo ChromaDB: {}", idStr);
                    }
                }
            }

            if (dbIds.isEmpty()) {
                return Collections.emptyList();
            }

            // Busca os registros relacionais correspondentes no banco SQL
            List<PdfChunk> chunks = pdfChunkRepository.findAllById(dbIds);
            List<PdfChunkSimilarity> results = new ArrayList<>();

            for (PdfChunk chunk : chunks) {
                Double distance = distanceMap.getOrDefault(chunk.getId(), 0.0);
                // Converte distância L2 em score de similaridade (Ex: 1 / (1 + distance))
                Double similarityScore = 1.0 / (1.0 + distance);
                results.add(new PdfChunkSimilarity(chunk, similarityScore));
            }

            // Ordena os resultados por score de similaridade decrescente
            results.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));

            return results;

        } catch (Exception e) {
            log.error("Falha ao comunicar com o ChromaDB para busca vetorial. Iniciando busca de fallback.", e);
            return fallbackSearch(examPrepId, queryText, limit);
        }
    }

    /**
     * Busca de fallback usando busca por palavra-chave textual na base de dados quando o ChromaDB estiver offline.
     */
    private List<PdfChunkSimilarity> fallbackSearch(Long examPrepId, String queryText, int limit) {
        log.warn("ChromaDB indisponível. Executando busca por palavra-chave de fallback nos chunks cadastrados.");
        List<PdfChunk> allChunks = pdfChunkRepository.findByExamPrepId(examPrepId);
        List<PdfChunkSimilarity> matches = new ArrayList<>();

        String[] keywords = queryText.toLowerCase().split("\\s+");
        for (PdfChunk chunk : allChunks) {
            double score = 0.0;
            String text = chunk.getChunkText().toLowerCase();
            for (String keyword : keywords) {
                if (text.contains(keyword)) {
                    score += 1.0;
                }
            }
            if (score > 0.0) {
                matches.add(new PdfChunkSimilarity(chunk, score));
            }
        }

        // Ordena por score descendente
        matches.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));
        if (matches.size() > limit) {
            return matches.subList(0, limit);
        }
        return matches;
    }
}
