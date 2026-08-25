package com.studyplatform.file;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;



@Slf4j
@Service
@RequiredArgsConstructor
public class PdfProcessingService {

    private final PdfChunkRepository pdfChunkRepository;
    private final VectorIndexer vectorIndexer;

    public String extractText(InputStream inputStream) throws Exception {
        Tika tika = new Tika();
        return tika.parseToString(inputStream);
    }

    public List<String> splitIntoChunks(String text) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return chunks;
        }

        String[] words = text.split("\\s+");
        int chunkSize = 120; // ~700 caracteres (dentro da faixa de 500 a 1000 caracteres contextuais)
        int overlap = 15;    // Overlap para manter contexto semântico

        for (int i = 0; i < words.length; i += (chunkSize - overlap)) {
            int end = Math.min(words.length, i + chunkSize);
            String[] chunkWords = Arrays.copyOfRange(words, i, end);
            chunks.add(String.join(" ", chunkWords));
            if (end == words.length) {
                break;
            }
        }
        return chunks;
    }

    @Async
    @Transactional
    public void processFileAsync(UploadedFile file, java.nio.file.Path filePath) {
        log.info("Iniciando extração de texto assíncrona para arquivo ID: {}", file.getId());
        try {
            if (file.getSubject() == null || file.getSubject().getExamPrep() == null) {
                log.warn("Arquivo ID: {} não possui matéria ou preparação para prova associada. Abortando extração de texto.", file.getId());
                return;
            }

            // Verificar se o arquivo existe e tem conteúdo
            if (!java.nio.file.Files.exists(filePath) || java.nio.file.Files.size(filePath) == 0) {
                log.warn("Arquivo ID: {} não encontrado no disco ou vazio. Abortando extração de texto.", file.getId());
                return;
            }

            String text;
            try (InputStream inputStream = java.nio.file.Files.newInputStream(filePath)) {
                text = extractText(inputStream);
            }

            // Verificar se o texto extraído não está vazio
            if (text == null || text.isBlank()) {
                log.warn("Nenhum texto extraído do arquivo ID: {} (possível PDF escaneado ou sem texto legível). " +
                        "O upload foi realizado com sucesso, mas o conteúdo não pôde ser indexado para IA/RAG.", file.getId());
                return;
            }

            log.info("Texto extraído com sucesso do arquivo ID: {} ({} caracteres)", file.getId(), text.length());

            List<String> textChunks = splitIntoChunks(text);

            if (textChunks.isEmpty()) {
                log.warn("Arquivo ID: {} gerou 0 chunks após divisão do texto. Abortando indexação.", file.getId());
                return;
            }

            List<PdfChunk> chunksToSave = new ArrayList<>();
            for (int i = 0; i < textChunks.size(); i++) {
                PdfChunk chunk = PdfChunk.builder()
                        .chunkText(textChunks.get(i))
                        .chunkIndex(i)
                        .uploadedFile(file)
                        .examPrep(file.getSubject().getExamPrep())
                        .build();
                chunksToSave.add(chunk);
            }

            List<PdfChunk> savedChunks = pdfChunkRepository.saveAll(chunksToSave);
            log.info("Salvo {} chunks no banco de dados para arquivo ID: {}", savedChunks.size(), file.getId());

            try {
                vectorIndexer.storeChunks(savedChunks);
                log.info("Indexação vetorial concluída com sucesso para arquivo ID: {} ({} chunks indexados)", file.getId(), savedChunks.size());
            } catch (Exception vectorEx) {
                log.error("Falha na indexação vetorial para arquivo ID: {}. Os chunks foram salvos no banco, mas não indexados no ChromaDB. " +
                        "Busca por similaridade usará fallback textual.", file.getId(), vectorEx);
            }
        } catch (Exception ex) {
            log.error("Erro no processamento assíncrono de extração de texto para arquivo ID: {}. " +
                    "Verifique se o arquivo é um PDF válido e não está corrompido.", file.getId(), ex);
        }
    }
}
