package com.studyplatform.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class TtsService {

    public void textToSpeech(String text, Path targetPath) throws IOException {
        try {
            // Limpa formatação básica antes de converter em fala
            String cleanText = cleanTextForTts(text);

            // Divide em trechos menores que 150 caracteres para respeitar o limite do Google Translate TTS (200 caracteres)
            List<String> chunks = splitTextIntoChunks(cleanText, 150);
            log.info("Iniciando conversão de texto para fala (TTS). Fragmentos calculados: {}", chunks.size());

            // Cria diretórios pais se não existirem
            if (targetPath.getParent() != null) {
                Files.createDirectories(targetPath.getParent());
            }

            try (OutputStream out = new BufferedOutputStream(Files.newOutputStream(targetPath))) {
                for (String chunk : chunks) {
                    if (chunk.trim().isEmpty()) continue;
                    byte[] audioBytes = downloadChunk(chunk);
                    out.write(audioBytes);
                }
            }
            log.info("Áudio do podcast gerado e salvo com sucesso em: {}", targetPath);
        } catch (Exception e) {
            log.error("Erro durante o processamento de TTS. Gerando fallback de áudio silencioso/mock. Detalhe: {}", e.getMessage());
            generateFallbackAudio(targetPath);
        }
    }

    private String cleanTextForTts(String text) {
        if (text == null) return "";
        // Remove tags HTML, marcações markdown, asteriscos e caracteres especiais do roteiro gerado
        return text.replaceAll("<[^>]*>", "")
                   .replaceAll("\\*+", "")
                   .replaceAll("#+", "")
                   .replaceAll("`+", "")
                   .replaceAll("-\\s+", " ")
                   .replaceAll("\\s+", " ")
                   .trim();
    }

    private List<String> splitTextIntoChunks(String text, int maxLength) {
        List<String> chunks = new ArrayList<>();
        String[] sentences = text.split("(?<=[.!?])\\s+");
        for (String sentence : sentences) {
            sentence = sentence.trim();
            if (sentence.isEmpty()) continue;
            
            if (sentence.length() <= maxLength) {
                chunks.add(sentence);
            } else {
                String[] words = sentence.split("\\s+");
                StringBuilder currentChunk = new StringBuilder();
                for (String word : words) {
                    if (currentChunk.length() + word.length() + 1 > maxLength) {
                        chunks.add(currentChunk.toString().trim());
                        currentChunk = new StringBuilder();
                    }
                    currentChunk.append(word).append(" ");
                }
                if (currentChunk.length() > 0) {
                    chunks.add(currentChunk.toString().trim());
                }
            }
        }
        return chunks;
    }

    private byte[] downloadChunk(String text) throws IOException {
        String encodedText = URLEncoder.encode(text, StandardCharsets.UTF_8.name());
        String urlString = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=pt-BR&q=" + encodedText;
        
        URL url = new URL(urlString);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

        if (conn.getResponseCode() != 200) {
            throw new IOException("Google TTS respondeu com código de erro: " + conn.getResponseCode());
        }

        try (InputStream in = conn.getInputStream();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
            return out.toByteArray();
        }
    }

    private void generateFallbackAudio(Path targetPath) throws IOException {
        // Arquivo MP3 silencioso mínimo e válido de 1 segundo (24 bytes)
        byte[] silentMp3Bytes = new byte[]{
            (byte) 0xFF, (byte) 0xFB, (byte) 0x10, (byte) 0xC4, (byte) 0x00, (byte) 0x03, (byte) 0xC0, (byte) 0x00, 
            (byte) 0x01, (byte) 0xA4, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x20, (byte) 0x00, (byte) 0x00,
            (byte) 0x34, (byte) 0x80, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x04, (byte) 0x00, (byte) 0x00
        };
        Files.write(targetPath, silentMp3Bytes);
    }
}
