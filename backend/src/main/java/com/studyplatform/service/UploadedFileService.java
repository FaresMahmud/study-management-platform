package com.studyplatform.service;

import com.studyplatform.dto.request.FileAnnotationDTO;
import com.studyplatform.dto.response.UploadedFileResponseDTO;
import com.studyplatform.entity.*;
import com.studyplatform.exception.BusinessException;
import com.studyplatform.exception.ResourceNotFoundException;
import com.studyplatform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UploadedFileService {

    private final UploadedFileRepository uploadedFileRepository;
    private final FileAnnotationRepository fileAnnotationRepository;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;

    private final Path fileStorageLocation = Paths.get("uploads").toAbsolutePath().normalize();

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    @Transactional
    public UploadedFileResponseDTO uploadFile(MultipartFile file, Long subjectId) {
        User user = getAuthenticatedUser();
        Subject subject = subjectRepository.findByIdAndUserId(subjectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Matéria não encontrada"));

        try {
            Files.createDirectories(this.fileStorageLocation);

            String originalFileName = file.getOriginalFilename();
            if (originalFileName == null) {
                originalFileName = "unnamed_file.pdf";
            }
            String uniqueFileName = UUID.randomUUID().toString() + "_" + originalFileName;
            Path targetLocation = this.fileStorageLocation.resolve(uniqueFileName);

            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            UploadedFile uploadedFile = UploadedFile.builder()
                    .fileName(originalFileName)
                    .filePath(uniqueFileName)
                    .contentType(file.getContentType() != null ? file.getContentType() : "application/pdf")
                    .fileSize(file.getSize())
                    .user(user)
                    .subject(subject)
                    .build();

            UploadedFile saved = uploadedFileRepository.save(uploadedFile);

            return mapToResponseDTO(saved);
        } catch (IOException ex) {
            throw new BusinessException("Não foi possível salvar o arquivo físico: " + ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<UploadedFileResponseDTO> listAll() {
        User user = getAuthenticatedUser();
        return uploadedFileRepository.findByUserId(user.getId())
                .stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UploadedFileResponseDTO> listBySubject(Long subjectId) {
        User user = getAuthenticatedUser();
        return uploadedFileRepository.findByUserIdAndSubjectId(user.getId(), subjectId)
                .stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Path getFileLocation(Long fileId) {
        User user = getAuthenticatedUser();
        UploadedFile uploadedFile = uploadedFileRepository.findByIdAndUserId(fileId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo não encontrado"));

        return this.fileStorageLocation.resolve(uploadedFile.getFilePath()).normalize();
    }

    @Transactional
    public void deleteFile(Long fileId) {
        User user = getAuthenticatedUser();
        UploadedFile uploadedFile = uploadedFileRepository.findByIdAndUserId(fileId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo não encontrado"));

        try {
            Path path = this.fileStorageLocation.resolve(uploadedFile.getFilePath()).normalize();
            Files.deleteIfExists(path);

            List<FileAnnotation> annotations = fileAnnotationRepository.findByUploadedFileId(fileId);
            fileAnnotationRepository.deleteAll(annotations);

            uploadedFileRepository.delete(uploadedFile);
        } catch (IOException ex) {
            throw new BusinessException("Erro ao deletar o arquivo do disco: " + ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<FileAnnotationDTO> getAnnotations(Long fileId, Integer pageNumber) {
        User user = getAuthenticatedUser();
        uploadedFileRepository.findByIdAndUserId(fileId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo não encontrado"));

        List<FileAnnotation> annotations;
        if (pageNumber != null) {
            annotations = fileAnnotationRepository.findByUploadedFileIdAndPageNumber(fileId, pageNumber);
        } else {
            annotations = fileAnnotationRepository.findByUploadedFileId(fileId);
        }

        return annotations.stream()
                .map(this::mapToAnnotationDTO)
                .toList();
    }

    @Transactional
    public FileAnnotationDTO saveAnnotation(FileAnnotationDTO dto) {
        User user = getAuthenticatedUser();
        UploadedFile file = uploadedFileRepository.findByIdAndUserId(dto.getFileId(), user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo não encontrado"));

        FileAnnotation annotation;
        if (dto.getId() != null) {
            annotation = fileAnnotationRepository.findByIdAndUploadedFileUserId(dto.getId(), user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Anotação não encontrada"));
            annotation.setContent(dto.getContent());
            annotation.setType(dto.getType());
            annotation.setPageNumber(dto.getPageNumber());
        } else {
            annotation = FileAnnotation.builder()
                    .uploadedFile(file)
                    .pageNumber(dto.getPageNumber())
                    .type(dto.getType())
                    .content(dto.getContent())
                    .build();
        }

        FileAnnotation saved = fileAnnotationRepository.save(annotation);
        return mapToAnnotationDTO(saved);
    }

    @Transactional
    public void deleteAnnotation(Long annotationId) {
        User user = getAuthenticatedUser();
        FileAnnotation annotation = fileAnnotationRepository.findByIdAndUploadedFileUserId(annotationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Anotação não encontrada"));

        fileAnnotationRepository.delete(annotation);
    }

    private UploadedFileResponseDTO mapToResponseDTO(UploadedFile file) {
        return UploadedFileResponseDTO.builder()
                .id(file.getId())
                .fileName(file.getFileName())
                .contentType(file.getContentType())
                .fileSize(file.getFileSize())
                .uploadDate(file.getUploadDate())
                .subjectId(file.getSubject().getId())
                .subjectName(file.getSubject().getSubjectName())
                .build();
    }

    private FileAnnotationDTO mapToAnnotationDTO(FileAnnotation annotation) {
        return FileAnnotationDTO.builder()
                .id(annotation.getId())
                .fileId(annotation.getUploadedFile().getId())
                .pageNumber(annotation.getPageNumber())
                .type(annotation.getType())
                .content(annotation.getContent())
                .lastModified(annotation.getLastModified())
                .build();
    }
}
