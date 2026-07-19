package com.studyplatform.subject;
import com.studyplatform.subject.Subject;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {

    Page<Subject> findByUserId(Long userId, Pageable pageable);

    // Garante ownership: só retorna se o subject pertencer ao usuário informado
    Optional<Subject> findByIdAndUserId(Long id, Long userId);

    boolean existsBySubjectNameAndUserId(String subjectName, Long userId);
}
