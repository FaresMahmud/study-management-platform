package com.studyplatform.ai;

import com.studyplatform.ai.vector.PdfChunkSimilarity;
import com.studyplatform.ai.vector.VectorStoreService;
import com.studyplatform.file.PdfChunk;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Serviço responsável por orquestrar a busca semântica e a resposta contextualizada (RAG).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RAGChatService {

    private final VectorStoreService vectorStoreService;
    private final GeminiService geminiService;

    public ChatResponseDTO askQuestion(Long examPrepId, String question, Boolean socratic, String imageMimeType, String imageBase64) {
        log.info("Processando pergunta RAG para o examPrepId: {}. Pergunta: {}. Modo Socrático: {}. Imagem: {}", examPrepId, question, socratic, imageMimeType);

        // Busca os 5 chunks mais relevantes no ChromaDB correspondentes ao exame ativo
        List<PdfChunkSimilarity> similarities = vectorStoreService.searchSimilar(examPrepId, question, 5);

        // Se não houver nenhum contexto relevante encontrado
        if (similarities.isEmpty()) {
            return ChatResponseDTO.builder()
                    .answer("Olá! Eu sou o seu tutor StudyFlow. Atualmente não encontramos nenhum material de estudo em PDF indexado para este exame correspondente à sua pergunta. Por favor, faça o upload de arquivos PDF de estudo associados a esta preparação para que eu possa ajudá-lo com respostas personalizadas!")
                    .sources(new ArrayList<>())
                    .build();
        }

        // Formata o contexto
        StringBuilder contextBuilder = new StringBuilder();
        List<String> sources = new ArrayList<>();

        for (int i = 0; i < similarities.size(); i++) {
            PdfChunkSimilarity sim = similarities.get(i);
            PdfChunk chunk = sim.getPdfChunk();
            contextBuilder.append(String.format("--- Fragmento %d ---\n", i + 1));
            contextBuilder.append(chunk.getChunkText()).append("\n\n");

            if (chunk.getUploadedFile() != null) {
                String fileName = chunk.getUploadedFile().getFileName();
                if (!sources.contains(fileName)) {
                    sources.add(fileName);
                }
            }
        }

        String contextText = contextBuilder.toString();

        // Constrói o prompt para o Gemini
        String systemPrompt = "Você é um Tutor de Estudos Inteligente da plataforma StudyFlow.\n" +
                "Sua missão é responder à pergunta do estudante utilizando ESTRITAMENTE as informações contidas nos fragmentos de PDFs de estudo fornecidos abaixo como contexto.\n\n" +
                "Contexto de Estudos:\n" +
                contextText + "\n" +
                "Pergunta do estudante:\n" +
                question + "\n\n" +
                "Instruções:\n" +
                "1. Responda de forma clara, didática e estruturada.\n" +
                "2. Baseie sua resposta apenas no Contexto de Estudos fornecido. Não invente fatos ou traga informações externas que contradigam o contexto.\n" +
                "3. Se as informações fornecidas no contexto não forem suficientes para responder à pergunta de forma completa, diga educadamente que o material carregado não tem detalhes suficientes sobre esse ponto específico, mas responda o que for possível com base no contexto.";

        if (Boolean.TRUE.equals(socratic)) {
            systemPrompt += "\n4. MODO SOCRÁTICO ATIVO: Não entregue a resposta pronta nem a resolução direta da questão do estudante. Em vez disso, explique teoricamente o conceito por trás da dúvida de forma simplificada e faça uma ou mais perguntas que provoquem a reflexão ou orientem o raciocínio do aluno para que ele consiga deduzir e chegar à resposta correta por conta própria.";
        }

        // Mock Fallback se a API Key do Gemini não estiver configurada
        if (!geminiService.isConfigured()) {
            String mockAnswer = "Olá! Eu sou o seu Tutor Inteligente StudyFlow (Modo Demonstração). \n\n" +
                    "Recebi sua dúvida: \"" + question + "\"\n\n" +
                    (imageBase64 != null ? "Análise Visual de Imagem: Recebi a imagem do exercício/fórmula enviada. " : "") +
                    "Com base no contexto do material que você enviou, este tópico é de extrema relevância nos seus estudos. \n\n" +
                    "Como estou em modo de simulação no backend (chave de API do Gemini não configurada), aqui vai uma orientação conceitual geral sobre o tópico. Continue estudando os resumos e revise seus flashcards! Se quiser que eu resolva e explique detalhadamente de forma real, basta configurar a propriedade `gemini.api.key` nas configurações do backend.";
            if (Boolean.TRUE.equals(socratic)) {
                mockAnswer += "\n\n(Instrução Socrática): Que tal tentar formular o conceito básico dessa questão com suas próprias palavras para testar o entendimento?";
            }
            return ChatResponseDTO.builder()
                    .answer(mockAnswer)
                    .sources(sources)
                    .build();
        }

        try {
            String answer;
            if (imageBase64 != null && !imageBase64.trim().isEmpty()) {
                answer = geminiService.generateMultimodalContent(systemPrompt, imageMimeType, imageBase64);
            } else {
                answer = geminiService.generateContent(systemPrompt);
            }
            return ChatResponseDTO.builder()
                    .answer(answer)
                    .sources(sources)
                    .build();
        } catch (Exception e) {
            log.error("Erro ao obter resposta do Gemini para chat RAG", e);
            return ChatResponseDTO.builder()
                    .answer("Desculpe, ocorreu um erro de comunicação com meu serviço de inteligência artificial. Por favor, tente novamente em instantes.")
                    .sources(sources)
                    .build();
        }
    }
}
