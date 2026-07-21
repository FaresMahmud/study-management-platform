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

import com.studyplatform.ai.vector.VectorStoreService;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfProcessingService {

    private final PdfChunkRepository pdfChunkRepository;
    private final VectorStoreService vectorStoreService;

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
        int chunkSize = 600; // 600 palavras por chunk
        int overlap = 50;   // Overlap de 50 palavras para manter contexto semântico

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
    public void processFileAsync(UploadedFile file, InputStream inputStream) {
        log.info("Iniciando extração de texto assíncrona para arquivo ID: {}", file.getId());
        try {
            if (file.getSubject() == null || file.getSubject().getExamPrep() == null) {
                log.warn("Arquivo ID: {} não possui matéria ou preparação para prova associada. Abortando OCR.", file.getId());
                return;
            }

            String text = extractText(inputStream);
            List<String> textChunks = splitIntoChunks(text);

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
            vectorStoreService.storeChunks(savedChunks);
            log.info("Sucesso no processamento de OCR e indexação vetorial. Salvo e indexado {} chunks para arquivo ID: {}", savedChunks.size(), file.getId());
        } catch (Exception ex) {
            log.error("Erro no processamento assíncrono de OCR para arquivo ID: {}", file.getId(), ex);
        }
    }
}
