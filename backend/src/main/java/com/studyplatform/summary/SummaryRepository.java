package com.studyplatform.summary;
import com.studyplatform.summary.Summary;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SummaryRepository extends JpaRepository<Summary, Long> {

    Page<Summary> findByUserId(Long userId, Pageable pageable);

    Optional<Summary> findByIdAndUserId(Long id, Long userId);

    List<Summary> findByUserIdAndSubjectId(Long userId, Long subjectId);
}
