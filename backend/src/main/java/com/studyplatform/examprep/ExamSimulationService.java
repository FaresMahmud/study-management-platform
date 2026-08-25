package com.studyplatform.examprep;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.studyplatform.examprep.dto.ExamSimulationResponseDTO;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Serviço responsável por gerenciar simulações de exame cronometradas (Simulados).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExamSimulationService {

    private final ExamSimulationRepository examSimulationRepository;
    private final ExamPrepRepository examPrepRepository;
    private final StudyContextService studyContextService;
    private final QuestionGenerator questionGenerator;
    private final QuizAttemptService quizAttemptService;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final com.studyplatform.shared.security.SecurityService securityService;
    private final CacheManager cacheManager;

    private User getAuthenticatedUser() {
        return securityService.getAuthenticatedUser();
    }

    /**
     * Converte entidade ExamSimulation para DTO de resposta (evita serialização de proxies Hibernate).
     */
    public static ExamSimulationResponseDTO toResponseDTO(ExamSimulation es) {
        return ExamSimulationResponseDTO.builder()
                .id(es.getId())
                .examPrepId(es.getExamPrep().getId())
                .examPrepTitle(es.getExamPrep().getTitle())
                .startTime(es.getStartTime())
                .endTime(es.getEndTime())
                .score(es.getScore())
                .status(es.getStatus())
                .contentJson(es.getContentJson())
                .build();
    }

    /**
     * Inicia uma simulação cronometrada de 15 minutos com 3 questões geradas por IA
     * baseadas exclusivamente no material de estudo do usuário.
     */
    @Transactional
    public ExamSimulationResponseDTO startSimulation(Long examPrepId) {
        User user = getAuthenticatedUser();
        ExamPrep examPrep = examPrepRepository.findByIdAndUserId(examPrepId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Preparação de prova não encontrada"));

        // 1. Validar que existe contexto de estudo (PDFs/chunks)
        String contextText = studyContextService.getContextTextForExamPrep(examPrepId);
        if (contextText == null || contextText.trim().isEmpty()) {
            throw new BusinessException(
                "Não há material de estudo suficiente para gerar este simulado. " +
                "Adicione PDFs ou outros conteúdos à preparação antes de iniciar.");
        }

        // 2. Validar que o Gemini está configurado
        if (!questionGenerator.isConfigured()) {
            throw new BusinessException(
                "O serviço de geração de questões não está configurado. " +
                "Entre em contato com o administrador.");
        }

        // 3. Gerar questões via Gemini
        String questionsJson;
        try {
            String prompt = buildSimulationPrompt(contextText);
            questionsJson = questionGenerator.generateContent(prompt);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Falha ao gerar questões via Gemini para ExamPrep ID: {}", examPrepId, e);
            throw new BusinessException(
                "Falha ao gerar questões. Tente novamente mais tarde.");
        }

        // 4. Validar JSON retornado pelo Gemini
        validateQuestionsJson(questionsJson);

        // 5. Salvar e retornar
        ExamSimulation simulation = ExamSimulation.builder()
                .examPrep(examPrep)
                .startTime(LocalDateTime.now())
                .status(SimulationStatus.STARTED)
                .contentJson(questionsJson)
                .build();

        ExamSimulation saved = examSimulationRepository.save(simulation);
        ExamSimulation fetched = examSimulationRepository.findByIdWithExamPrep(saved.getId())
                .orElse(saved);
        return toResponseDTO(fetched);
    }

    /**
     * Monta o prompt para geração de questões, restringindo ao contexto fornecido.
     */
    private String buildSimulationPrompt(String contextText) {
        return "Você é o gerador de simulados do StudyFlow. " +
            "Baseando-se EXCLUSIVAMENTE no seguinte contexto de estudos, " +
            "crie 3 questões de múltipla escolha difíceis para uma simulação cronometrada.\n\n" +
            "REGRAS OBRIGATÓRIAS:\n" +
            "- Use APENAS informações presentes no contexto abaixo.\n" +
            "- NÃO invente, presupunha ou adicione informações que não estejam no texto.\n" +
            "- Se o contexto não for suficiente para 3 questões, gere apenas as que conseguir.\n\n" +
            "Formato: array JSON com objetos contendo 'question', 'options' (A/B/C/D) e 'correctAnswer'.\n" +
            "Retorne estritamente um array JSON sem formatação markdown (sem ```json).\n\n" +
            "Contexto de Estudos:\n" + contextText;
    }

    /**
     * Valida o JSON retornado pelo Gemini antes de persistir.
     */
    private void validateQuestionsJson(String json) {
        try {
            List<Map<String, Object>> questions = objectMapper.readValue(
                json, new TypeReference<>() {});
            if (questions == null || questions.isEmpty()) {
                throw new BusinessException("O serviço de IA não retornou questões válidas.");
            }
            for (Map<String, Object> q : questions) {
                if (q.get("question") == null || q.get("options") == null || q.get("correctAnswer") == null) {
                    throw new BusinessException("Resposta da IA contém questões com formato inválido.");
                }
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("JSON inválido retornado pelo Gemini", e);
            throw new BusinessException("O serviço de IA retornou um formato inválido. Tente novamente.");
        }
    }

    /**
     * Finaliza a simulação e calcula o resultado da prova cronometrada de 15 minutos.
     */
    @Transactional
    public ExamSimulationResponseDTO finishSimulation(Long simulationId, Map<Integer, String> answers) {
        User user = getAuthenticatedUser();
        ExamSimulation simulation = examSimulationRepository.findByIdAndExamPrepUserId(simulationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Simulado não encontrado"));

        if (simulation.getStatus() != SimulationStatus.STARTED) {
            throw new BusinessException("Este simulado já foi finalizado ou cancelado.");
        }

        LocalDateTime now = LocalDateTime.now();
        // Verifica se estourou os 15 minutos cronometrados (+30 segundos de tolerância de rede/latência)
        boolean isTimedOut = now.isAfter(simulation.getStartTime().plusMinutes(15).plusSeconds(30));
        SimulationStatus finalStatus = isTimedOut ? SimulationStatus.TIMED_OUT : SimulationStatus.COMPLETED;

        int correctCount = 0;
        try {
            List<Map<String, Object>> questions = objectMapper.readValue(
                    simulation.getContentJson(),
                    new TypeReference<>() {}
            );

            for (int i = 0; i < questions.size(); i++) {
                Map<String, Object> question = questions.get(i);
                String correctAnswer = (String) question.get("correctAnswer");
                String studentAnswer = answers.get(i); // Índice da resposta do aluno

                if (correctAnswer != null && correctAnswer.equalsIgnoreCase(studentAnswer)) {
                    correctCount++;
                }
            }
        } catch (Exception e) {
            log.error("Falha ao analisar JSON das questões no encerramento do simulado ID: {}", simulationId, e);
        }

        int score = (int) Math.round((double) correctCount / 3.0 * 100);

        simulation.setEndTime(now);
        simulation.setScore(score);
        simulation.setStatus(finalStatus);

        ExamSimulation saved = examSimulationRepository.save(simulation);
        // Re-busca com JOIN FETCH no examPrep para acessar dados dentro da transação
        saved = examSimulationRepository.findByIdWithExamPrep(saved.getId()).orElse(saved);
        log.info("Simulado ID: {} finalizado com status: {} e Score: {}", simulationId, finalStatus, score);

        // Eviction manual do cache do leaderboard (substitui @CacheEvict que não resolvia parâmetro dinâmico)
        var cache = cacheManager.getCache("leaderboard");
        if (cache != null) {
            cache.evict(simulation.getExamPrep().getId());
        }

        // Publica evento para recálculo de maestria assíncrono
        eventPublisher.publishEvent(new ExamPrepActivityEvent(this, simulation.getExamPrep().getId()));

        return toResponseDTO(saved);
    }
}
