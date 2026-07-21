package com.studyplatform.ai;

import com.studyplatform.ai.vector.PdfChunkSimilarity;
import com.studyplatform.ai.vector.VectorStoreService;
import com.studyplatform.file.PdfChunk;
import com.studyplatform.file.UploadedFile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RAGChatServiceTest {

    @Mock
    private VectorStoreService vectorStoreService;

    @Mock
    private GeminiService geminiService;

    @InjectMocks
    private RAGChatService ragChatService;

    private Long examPrepId;
    private String question;

    @BeforeEach
    void setUp() {
        examPrepId = 1L;
        question = "O que é fotossíntese?";
    }

    @Test
    void testAskQuestionNoContext() {
        when(vectorStoreService.searchSimilar(anyLong(), anyString(), anyInt()))
                .thenReturn(Collections.emptyList());

        ChatResponseDTO response = ragChatService.askQuestion(examPrepId, question);

        assertNotNull(response);
        assertTrue(response.getAnswer().contains("não encontramos nenhum material de estudo"));
        assertTrue(response.getSources().isEmpty());
        try {
            verify(geminiService, never()).generateContent(anyString());
        } catch (Exception e) {
            fail(e);
        }
    }

    @Test
    void testAskQuestionWithContext() throws Exception {
        UploadedFile file = UploadedFile.builder()
                .id(1L)
                .fileName("biologia.pdf")
                .build();

        PdfChunk chunk = PdfChunk.builder()
                .id(1L)
                .chunkText("A fotossíntese é o processo pelo qual plantas produzem energia utilizando luz solar.")
                .uploadedFile(file)
                .build();

        PdfChunkSimilarity similarity = new PdfChunkSimilarity(chunk, 0.9);

        when(vectorStoreService.searchSimilar(eq(examPrepId), eq(question), eq(5)))
                .thenReturn(List.of(similarity));

        when(geminiService.generateContent(anyString()))
                .thenReturn("A fotossíntese é o processo de produção de energia das plantas.");

        ChatResponseDTO response = ragChatService.askQuestion(examPrepId, question);

        assertNotNull(response);
        assertEquals("A fotossíntese é o processo de produção de energia das plantas.", response.getAnswer());
        assertEquals(1, response.getSources().size());
        assertEquals("biologia.pdf", response.getSources().get(0));
    }
}
