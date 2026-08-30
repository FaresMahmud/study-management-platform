package com.studyplatform.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import lombok.extern.slf4j.Slf4j;

/**
 * Configuração que seleciona o provedor de IA ativo (Gemini ou Nvidia)
 * com base na propriedade AI_PROVIDER.
 *
 * Sem fallback automático: o provider é selecionado exclusivamente por configuração.
 * Embeddings continuam usando Gemini independentemente do provider selecionado.
 */
@Slf4j
@Configuration
public class AiProviderConfig {

    @Value("${ai.provider:gemini}")
    private String provider;

    /**
     * Cria o bean primário de geração de texto baseado na configuração AI_PROVIDER.
     */
    @Bean
    @Primary
    public TextGenerationProvider textGenerationProvider(
            GeminiService geminiService,
            NvidiaNimService nvidiaNimService) {

        if ("nvidia".equalsIgnoreCase(provider) && nvidiaNimService.isConfigured()) {
            log.info("Provedor de IA configurado: NVIDIA (modelo: {})", nvidiaNimService.getNvidiaModel());
            return nvidiaNimService;
        }

        if (geminiService.isConfigured()) {
            log.info("Provedor de IA configurado: GEMINI (modelo: {})", geminiService.getTextModel());
            return geminiService;
        }

        // Nenhum provider configurado — retorna Gemini como padrão (comportamento de mock existente)
        log.warn("Nenhum provedor de IA configurado. Usando Gemini como padrão (mock fallback ativo).");
        return geminiService;
    }
}
