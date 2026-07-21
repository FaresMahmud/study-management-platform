package com.studyplatform.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PdfChunkRepository extends JpaRepository<PdfChunk, Long> {
    List<PdfChunk> findByUploadedFileId(Long fileId);
    List<PdfChunk> findByExamPrepId(Long examPrepId);
}
