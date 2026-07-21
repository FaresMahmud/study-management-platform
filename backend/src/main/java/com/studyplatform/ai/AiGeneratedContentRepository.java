package com.studyplatform.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AiGeneratedContentRepository extends JpaRepository<AiGeneratedContent, Long> {
    List<AiGeneratedContent> findByExamPrepIdAndContentType(Long examPrepId, ContentType contentType);
}
