package com.studyplatform.file;

import java.util.List;

/**
 * Interface para inverter a dependência entre o processamento de arquivos (OCR) e
 * a indexação vetorial no ChromaDB.
 */
public interface VectorIndexer {
    void storeChunks(List<PdfChunk> chunks);
}
