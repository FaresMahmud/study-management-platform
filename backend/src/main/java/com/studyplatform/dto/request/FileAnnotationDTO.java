package com.studyplatform.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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
