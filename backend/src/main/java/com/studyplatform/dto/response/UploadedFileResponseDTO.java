package com.studyplatform.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadedFileResponseDTO {
    private Long id;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private LocalDateTime uploadDate;
    private Long subjectId;
    private String subjectName;
}
