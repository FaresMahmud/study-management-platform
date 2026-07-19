package com.studyplatform.file;
import com.studyplatform.file.FileAnnotation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FileAnnotationRepository extends JpaRepository<FileAnnotation, Long> {

    List<FileAnnotation> findByUploadedFileId(Long fileId);

    List<FileAnnotation> findByUploadedFileIdAndPageNumber(Long fileId, Integer pageNumber);

    Optional<FileAnnotation> findByIdAndUploadedFileUserId(Long id, Long userId);
}
