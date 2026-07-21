package com.studyplatform.ai.vector;

import com.studyplatform.file.PdfChunk;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO que representa o resultado de uma busca de similaridade semântica de PDF chunks.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PdfChunkSimilarity {
    private PdfChunk pdfChunk;
    private Double score;
}
