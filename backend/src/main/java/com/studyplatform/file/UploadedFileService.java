package com.studyplatform.file;
import com.studyplatform.file.FileAnnotation;
import com.studyplatform.file.FileAnnotationRepository;
import com.studyplatform.file.UploadedFile;
import com.studyplatform.file.UploadedFileRepository;
import com.studyplatform.file.dto.FileAnnotationDTO;
import com.studyplatform.file.dto.UploadedFileResponseDTO;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectRepository;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@lombok.extern.slf4j.Slf4j
@Service
@RequiredArgsConstructor
public class UploadedFileService {

    private final UploadedFileRepository uploadedFileRepository;
    private final FileAnnotationRepository fileAnnotationRepository;
    private final PdfChunkRepository pdfChunkRepository;
    private final SubjectRepository subjectRepository;
    private final PdfProcessingService pdfProcessingService;
    private final com.studyplatform.shared.security.SecurityService securityService;

    private final Path fileStorageLocation = Paths.get("uploads").toAbsolutePath().normalize();

    /** Tamanho máximo de upload: 50 MB */
    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024;

    private User getAuthenticatedUser() {
        return securityService.getAuthenticatedUser();
    }

    @Transactional
    public UploadedFileResponseDTO uploadFile(MultipartFile file, Long subjectId) {
        User user = getAuthenticatedUser();
        Subject subject = subjectRepository.findByIdAndUserId(subjectId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Matéria não encontrada"));

        // Validação de tamanho
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("O arquivo excede o limite de 50 MB. Tamanho atual: " + (file.getSize() / (1024 * 1024)) + " MB.");
        }

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
            log.info("Arquivo PDF salvo com sucesso. ID: {}, Nome: {}, Tamanho: {} bytes", saved.getId(), originalFileName, file.getSize());

            // Dispara extração de texto assíncrona baseada no arquivo salvo em disco
            try {
                pdfProcessingService.processFileAsync(saved, targetLocation);
                log.info("Processamento assíncrono de OCR enfileirado para arquivo ID: {}", saved.getId());
            } catch (Exception ex) {
                log.error("Erro ao enfileirar processamento assíncrono de OCR para o arquivo ID: {}", saved.getId(), ex);
            }

            return mapToResponseDTO(saved);
        } catch (IOException ex) {
            throw new BusinessException("Não foi possível salvar o arquivo físico: " + ex.getMessage());
        }
    }


    @Transactional
    public Page<UploadedFileResponseDTO> listAll(int page, int size) {
        User user = getAuthenticatedUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<UploadedFile> filesPage = uploadedFileRepository.findByUserId(user.getId(), pageable);

        for (UploadedFile file : filesPage.getContent()) {
            Path path = this.fileStorageLocation.resolve(file.getFilePath()).normalize();
            if (!Files.exists(path)) {
                log.warn("Arquivo órfão detectado em listAll: ID {}, Caminho: {}. Limpando registro.", file.getId(), file.getFilePath());
                cleanupOrphanedFile(file);
            }
        }

        return uploadedFileRepository.findByUserId(user.getId(), pageable)
                .map(this::mapToResponseDTO);
    }

    @Transactional
    public List<UploadedFileResponseDTO> listBySubject(Long subjectId) {
        User user = getAuthenticatedUser();
        List<UploadedFile> files = uploadedFileRepository.findByUserIdAndSubjectId(user.getId(), subjectId);
        List<UploadedFile> validFiles = new ArrayList<>();

        for (UploadedFile file : files) {
            Path path = this.fileStorageLocation.resolve(file.getFilePath()).normalize();
            if (Files.exists(path)) {
                validFiles.add(file);
            } else {
                log.warn("Arquivo órfão detectado em listBySubject: ID {}, Caminho: {}. Limpando registro.", file.getId(), file.getFilePath());
                cleanupOrphanedFile(file);
            }
        }

        return validFiles.stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    private void cleanupOrphanedFile(UploadedFile file) {
        try {
            List<PdfChunk> chunks = pdfChunkRepository.findByUploadedFileId(file.getId());
            pdfChunkRepository.deleteAll(chunks);
            List<FileAnnotation> annotations = fileAnnotationRepository.findByUploadedFileId(file.getId());
            fileAnnotationRepository.deleteAll(annotations);
            uploadedFileRepository.delete(file);
        } catch (Exception ex) {
            log.error("Erro ao limpar arquivo órfão ID: {}", file.getId(), ex);
        }
    }

    @Transactional(readOnly = true)
    public Path getFileLocation(Long fileId) {
        User user = getAuthenticatedUser();
        UploadedFile uploadedFile = uploadedFileRepository.findByIdAndUserId(fileId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo não encontrado"));

        Path path = this.fileStorageLocation.resolve(uploadedFile.getFilePath()).normalize();
        if (!Files.exists(path)) {
            throw new ResourceNotFoundException("Arquivo físico não encontrado no servidor.");
        }
        return path;
    }

    @Transactional
    public void deleteFile(Long fileId) {
        User user = getAuthenticatedUser();
        UploadedFile uploadedFile = uploadedFileRepository.findByIdAndUserId(fileId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo não encontrado"));

        try {
            Path path = this.fileStorageLocation.resolve(uploadedFile.getFilePath()).normalize();
            Files.deleteIfExists(path);

            List<PdfChunk> chunks = pdfChunkRepository.findByUploadedFileId(fileId);
            pdfChunkRepository.deleteAll(chunks);

            List<FileAnnotation> annotations = fileAnnotationRepository.findByUploadedFileId(fileId);
            fileAnnotationRepository.deleteAll(annotations);

            uploadedFileRepository.delete(uploadedFile);
        } catch (IOException ex) {
            throw new BusinessException("Erro ao deletar o arquivo do disco: " + ex.getMessage());
        }
    }

    @org.springframework.context.event.EventListener
    @Transactional
    public void handleSubjectDeleted(com.studyplatform.subject.SubjectDeletedEvent event) {
        List<UploadedFile> files = uploadedFileRepository.findBySubjectId(event.subjectId());
        for (UploadedFile file : files) {
            try {
                Path path = this.fileStorageLocation.resolve(file.getFilePath()).normalize();
                Files.deleteIfExists(path);
            } catch (Exception ex) {
                log.warn("Erro ao deletar arquivo físico {}: {}", file.getFilePath(), ex.getMessage());
            }

            List<PdfChunk> chunks = pdfChunkRepository.findByUploadedFileId(file.getId());
            pdfChunkRepository.deleteAll(chunks);

            List<FileAnnotation> annotations = fileAnnotationRepository.findByUploadedFileId(file.getId());
            fileAnnotationRepository.deleteAll(annotations);

            uploadedFileRepository.delete(file);
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
