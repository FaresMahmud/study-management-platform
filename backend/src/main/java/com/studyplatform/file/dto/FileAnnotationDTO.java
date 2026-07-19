package com.studyplatform.file.dto;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileAnnotationDTO {
    private Long id;
    private Long fileId;
    private Integer pageNumber;
    private String type;
    private String content;
    private LocalDateTime lastModified;
}
