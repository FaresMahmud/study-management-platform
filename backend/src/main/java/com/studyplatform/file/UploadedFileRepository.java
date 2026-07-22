package com.studyplatform.file;
import com.studyplatform.file.UploadedFile;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long> {

    Page<UploadedFile> findByUserId(Long userId, Pageable pageable);

    Optional<UploadedFile> findByIdAndUserId(Long id, Long userId);

    List<UploadedFile> findByUserIdAndSubjectId(Long userId, Long subjectId);
    
    List<UploadedFile> findBySubjectId(Long subjectId);
}
