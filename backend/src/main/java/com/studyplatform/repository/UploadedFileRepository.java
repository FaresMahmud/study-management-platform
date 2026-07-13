package com.studyplatform.repository;

import com.studyplatform.entity.UploadedFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long> {

    List<UploadedFile> findByUserId(Long userId);

    Optional<UploadedFile> findByIdAndUserId(Long id, Long userId);

    List<UploadedFile> findByUserIdAndSubjectId(Long userId, Long subjectId);
}
