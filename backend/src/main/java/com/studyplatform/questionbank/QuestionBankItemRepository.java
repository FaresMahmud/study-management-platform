package com.studyplatform.questionbank;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionBankItemRepository extends JpaRepository<QuestionBankItem, Long> {

    List<QuestionBankItem> findBySubjectIdAndStatusOrderByTimesUsedAsc(Long subjectId, QuestionBankStatus status, Pageable pageable);

    long countBySubjectIdAndStatus(Long subjectId, QuestionBankStatus status);

    long countBySubjectId(Long subjectId);

    @Query("SELECT q.questionText FROM QuestionBankItem q WHERE q.subject.id = :subjectId ORDER BY q.createdAt DESC")
    List<String> findRecentQuestionTextsBySubjectId(@Param("subjectId") Long subjectId, Pageable pageable);

    List<QuestionBankItem> findBySubjectIdOrderByCreatedAtDesc(Long subjectId, Pageable pageable);
}
