package com.studyplatform.ai;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller responsável por expor as APIs de conversação com o Tutor Contextual (RAG).
 */
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "Tutor Inteligente Contextual (RAG)", description = "APIs de Chat para tirar dúvidas baseado nos PDFs de estudos do aluno")
public class ChatController {

    private final RAGChatService ragChatService;

    @Operation(
            summary = "Perguntar ao tutor inteligente baseado no contexto do exame",
            description = "Recupera os trechos mais relevantes de arquivos PDF associados ao exame e formula uma resposta contextualizada"
    )
    @PostMapping("/ask")
    public ResponseEntity<ChatResponseDTO> ask(@RequestBody ChatRequestDTO request) {
        ChatResponseDTO response = ragChatService.askQuestion(request.getExamPrepId(), request.getQuestion());
        return ResponseEntity.ok(response);
    }
}
