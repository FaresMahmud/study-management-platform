package com.studyplatform.ai.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RAGChatResponse {
    private String answer;
}
