package com.studyplatform.file;

import com.studyplatform.examprep.StudyContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementação do serviço de contexto de estudos para injeção no pacote examprep.
 */
@Service
@RequiredArgsConstructor
public class StudyContextServiceImpl implements StudyContextService {

    private final PdfChunkRepository pdfChunkRepository;

    @Override
    public String getContextTextForExamPrep(Long examPrepId) {
        List<PdfChunk> chunks = pdfChunkRepository.findByExamPrepId(examPrepId);
        return chunks.stream()
                .limit(5) // Limitado a 5 blocos para não estourar o contexto nos testes/dev
                .map(PdfChunk::getChunkText)
                .collect(Collectors.joining("\n\n"));
    }

    @Override
    public boolean hasContextForExamPrep(Long examPrepId) {
        List<PdfChunk> chunks = pdfChunkRepository.findByExamPrepId(examPrepId);
        return chunks != null && !chunks.isEmpty();
    }
}
