package com.studyplatform.repository;

import com.studyplatform.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {

    List<Subject> findByUserId(Long userId);

    // Garante ownership: só retorna se o subject pertencer ao usuário informado
    Optional<Subject> findByIdAndUserId(Long id, Long userId);

    boolean existsBySubjectNameAndUserId(String subjectName, Long userId);
}
