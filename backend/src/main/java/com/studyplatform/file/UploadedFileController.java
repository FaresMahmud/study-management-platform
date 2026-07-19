package com.studyplatform.file;
import com.studyplatform.file.UploadedFileService;
import com.studyplatform.file.dto.FileAnnotationDTO;
import com.studyplatform.file.dto.UploadedFileResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Tag(name = "Gerenciamento de Arquivos e PDFs", description = "Upload de PDFs de aula, download e controle de anotações persistentes")
public class UploadedFileController {

    private final UploadedFileService uploadedFileService;

    @Operation(summary = "Fazer upload de PDF", description = "Faz o upload de um arquivo PDF vinculado a uma matéria específica")
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<UploadedFileResponseDTO> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("subjectId") Long subjectId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(uploadedFileService.uploadFile(file, subjectId));
    }


    @Operation(summary = "Listar todos os arquivos PDF do usuário paginados")
    @GetMapping
    public ResponseEntity<Page<UploadedFileResponseDTO>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(uploadedFileService.listAll(page, size));
    }

    @Operation(summary = "Listar arquivos PDF por matéria")
    @GetMapping("/subject/{subjectId}")
    public ResponseEntity<List<UploadedFileResponseDTO>> listBySubject(@PathVariable Long subjectId) {
        return ResponseEntity.ok(uploadedFileService.listBySubject(subjectId));
    }

    @Operation(summary = "Visualizar arquivo PDF", description = "Retorna o fluxo de bytes do PDF com headers apropriados para renderização direta no frontend")
    @GetMapping("/{id}/view")
    public ResponseEntity<Resource> viewFile(@PathVariable Long id) {
        try {
            Path filePath = uploadedFileService.getFileLocation(id);
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_TYPE, "application/pdf")
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Deletar arquivo PDF", description = "Exclui o arquivo do banco de dados e apaga o arquivo físico do disco")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long id) {
        uploadedFileService.deleteFile(id);
        return ResponseEntity.noContent().build();
    }

    // ================= ROTAS DE ANOTAÇÕES =================

    @Operation(summary = "Listar anotações do PDF", description = "Retorna as anotações do arquivo, opcionalmente filtrando por número de página")
    @GetMapping("/{id}/annotations")
    public ResponseEntity<List<FileAnnotationDTO>> getAnnotations(
            @PathVariable Long id,
            @RequestParam(name = "page", required = false) Integer page) {
        return ResponseEntity.ok(uploadedFileService.getAnnotations(id, page));
    }

    @Operation(summary = "Salvar ou atualizar anotação no PDF")
    @PostMapping("/annotations")
    public ResponseEntity<FileAnnotationDTO> saveAnnotation(@RequestBody FileAnnotationDTO dto) {
        return ResponseEntity.ok(uploadedFileService.saveAnnotation(dto));
    }

    @Operation(summary = "Excluir anotação do PDF")
    @DeleteMapping("/annotations/{annotationId}")
    public ResponseEntity<Void> deleteAnnotation(@PathVariable Long annotationId) {
        uploadedFileService.deleteAnnotation(annotationId);
        return ResponseEntity.noContent().build();
    }
}
