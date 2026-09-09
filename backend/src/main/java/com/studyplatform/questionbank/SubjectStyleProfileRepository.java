package com.studyplatform.questionbank;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SubjectStyleProfileRepository extends JpaRepository<SubjectStyleProfile, Long> {
    Optional<SubjectStyleProfile> findBySubjectId(Long subjectId);
    void deleteBySubjectId(Long subjectId);
}
