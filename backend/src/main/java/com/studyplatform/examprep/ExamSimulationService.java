package com.studyplatform.examprep;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.studyplatform.examprep.dto.ExamSimulationResponseDTO;
import com.studyplatform.questionbank.QuestionBankItem;
import com.studyplatform.questionbank.QuestionBankService;
import com.studyplatform.questionbank.QuestionGenerationJobService;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectRepository;
import com.studyplatform.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Serviço responsável por gerenciar simulações de exame cronometradas (Simulados).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExamSimulationService {

    private final ExamSimulationRepository examSimulationRepository;
    private final ExamPrepRepository examPrepRepository;
    private final SubjectRepository subjectRepository;
    private final StudyContextService studyContextService;
    private final QuestionGenerator questionGenerator;
    private final QuizAttemptService quizAttemptService;
    private final QuestionBankService questionBankService;
    private final QuestionGenerationJobService questionGenerationJobService;
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
     * Assinatura legada para retrocompatibilidade.
     */
    @Transactional
    public ExamSimulationResponseDTO startSimulation(Long examPrepId) {
        return startSimulation(examPrepId, null, 10);
    }

    /**
     * Inicia simulação cronometrada servida a partir do Banco de Questões da Matéria,
     * ou dispara geração assíncrona se o banco estiver vazio.
     */
    @Transactional
    public ExamSimulationResponseDTO startSimulation(Long examPrepId, Long subjectId, Integer questionCount) {
        User user = getAuthenticatedUser();
        int requestedCount = (questionCount == null || questionCount <= 0) ? 10 : questionCount;

        ExamPrep examPrep = null;
        Subject subject = null;

        if (examPrepId != null) {
            examPrep = examPrepRepository.findByIdAndUserId(examPrepId, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Preparação de prova não encontrada com ID: " + examPrepId));
        }

        if (subjectId != null) {
            subject = subjectRepository.findByIdAndUserId(subjectId, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Matéria não encontrada com ID: " + subjectId));
            if (examPrep == null && subject.getExamPrep() != null) {
                examPrep = subject.getExamPrep();
            }
        }

        if (subject == null && examPrep != null) {
            List<Subject> subjects = subjectRepository.findByExamPrepId(examPrep.getId());
            if (!subjects.isEmpty()) {
                subject = subjects.get(0);
            }
        }

        if (examPrep == null) {
            throw new BusinessException("É necessário informar uma preparação de prova (examPrepId) ou uma matéria vinculada.");
        }

        // 1. Se temos matéria associada, tentar servir a partir do Banco de Questões
        if (subject != null) {
            List<QuestionBankItem> bankItems = questionBankService.pickQuestionsForSimulation(subject.getId(), requestedCount);

            if (!bankItems.isEmpty()) {
                boolean isPartial = bankItems.size() < requestedCount;
                String jobId = null;

                if (isPartial) {
                    try {
                        var jobResp = questionGenerationJobService.startJob(subject.getId(), requestedCount - bankItems.size(), false);
                        jobId = jobResp.getJobId();
                        log.info("Simulado parcial gerado com {} questões. Job de reposição {} iniciado.", bankItems.size(), jobId);
                    } catch (Exception ex) {
                        log.warn("Falha ao iniciar job de reposição de questões em background", ex);
                    }
                }

                String questionsJson = formatBankItemsToJson(bankItems);
                ExamSimulation simulation = ExamSimulation.builder()
                        .examPrep(examPrep)
                        .startTime(LocalDateTime.now())
                        .status(SimulationStatus.STARTED)
                        .contentJson(questionsJson)
                        .build();

                ExamSimulation saved = examSimulationRepository.save(simulation);
                ExamSimulation fetched = examSimulationRepository.findByIdWithExamPrep(saved.getId()).orElse(saved);

                ExamSimulationResponseDTO dto = toResponseDTO(fetched);
                dto.setPartial(isPartial);
                dto.setAvailable(bankItems.size());
                dto.setRequested(requestedCount);
                dto.setGenerationJobId(jobId);
                return dto;
            } else {
                // Banco de questões vazio para esta matéria
                String jobId = null;
                try {
                    var jobResp = questionGenerationJobService.startJob(subject.getId(), requestedCount, false);
                    jobId = jobResp.getJobId();
                    log.info("Banco vazio. Job de geração assíncrona {} iniciado para matéria {}.", jobId, subject.getSubjectName());
                } catch (Exception ex) {
                    log.warn("Falha ao disparar job para banco vazio", ex);
                }

                // Se houver material e o Gemini estiver configurado, roda o fallback legado imediato para o usuário não esperar
                if (studyContextService.hasContextForExamPrep(examPrep.getId()) && questionGenerator.isConfigured()) {
                    return startSimulationFallbackLegacy(examPrep, requestedCount, jobId);
                }

                // Retorna DTO sinalizando que o job foi enfileirado
                return ExamSimulationResponseDTO.builder()
                        .examPrepId(examPrep.getId())
                        .examPrepTitle(examPrep.getTitle())
                        .status(SimulationStatus.STARTED)
                        .contentJson("[]")
                        .partial(true)
                        .available(0)
                        .requested(requestedCount)
                        .generationJobId(jobId)
                        .build();
            }
        }

        // 2. Fallback geral caso a prova não tenha matéria associada
        return startSimulationFallbackLegacy(examPrep, requestedCount, null);
    }

    private ExamSimulationResponseDTO startSimulationFallbackLegacy(ExamPrep examPrep, int requestedCount, String jobId) {
        String contextText = studyContextService.getContextTextForExamPrep(examPrep.getId());
        if (contextText == null || contextText.trim().isEmpty()) {
            throw new BusinessException(
                    "Não há material de estudo suficiente para gerar este simulado. " +
                    "Adicione PDFs ou outros conteúdos à preparação antes de iniciar.");
        }

        if (!questionGenerator.isConfigured()) {
            throw new BusinessException(
                    "O serviço de geração de questões não está configurado. " +
                    "Entre em contato com o administrador.");
        }

        String questionsJson;
        try {
            String prompt = buildSimulationPrompt(contextText, Math.min(requestedCount, 5));
            questionsJson = questionGenerator.generateContent(prompt);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Falha ao gerar questões via Gemini para ExamPrep ID: {}", examPrep.getId(), e);
            throw new BusinessException("Falha ao gerar questões. Tente novamente mais tarde.");
        }

        validateQuestionsJson(questionsJson);

        ExamSimulation simulation = ExamSimulation.builder()
                .examPrep(examPrep)
                .startTime(LocalDateTime.now())
                .status(SimulationStatus.STARTED)
                .contentJson(questionsJson)
                .build();

        ExamSimulation saved = examSimulationRepository.save(simulation);
        ExamSimulation fetched = examSimulationRepository.findByIdWithExamPrep(saved.getId()).orElse(saved);

        ExamSimulationResponseDTO dto = toResponseDTO(fetched);
        dto.setGenerationJobId(jobId);
        return dto;
    }

    private String formatBankItemsToJson(List<QuestionBankItem> items) {
        List<Map<String, Object>> list = new ArrayList<>();
        String[] letters = {"A", "B", "C", "D", "E"};

        for (QuestionBankItem item : items) {
            Map<String, Object> map = new HashMap<>();
            map.put("question", item.getQuestionText());
            map.put("format", item.getFormat() != null ? item.getFormat().name() : "MULTIPLE_CHOICE_5");

            List<String> alts = new ArrayList<>();
            try {
                alts = objectMapper.readValue(item.getAlternatives(), new TypeReference<List<String>>() {});
            } catch (Exception ignored) {}
            map.put("alternatives", alts);

            // Mapeia options A, B, C, D... para compatibilidade
            Map<String, String> optionsMap = new LinkedHashMap<>();
            for (int i = 0; i < alts.size(); i++) {
                String key = (i < letters.length) ? letters[i] : String.valueOf(i);
                optionsMap.put(key, alts.get(i));
            }
            map.put("options", optionsMap);

            int correctIdx = item.getCorrectAlternativeIndex() != null ? item.getCorrectAlternativeIndex() : 0;
            String correctLetter = (correctIdx < letters.length) ? letters[correctIdx] : "A";
            map.put("correctAnswer", correctLetter);
            map.put("correctAlternativeIndex", correctIdx);
            map.put("explanation", item.getExplanation());
            map.put("topicHint", item.getTopicHint());

            list.add(map);
        }

        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    private String buildSimulationPrompt(String contextText, int count) {
        return "Você é o gerador de simulados do StudyFlow. " +
                "Baseando-se EXCLUSIVAMENTE no seguinte contexto de estudos, " +
                "crie " + count + " questões de múltipla escolha para uma simulação cronometrada.\n\n" +
                "REGRAS OBRIGATÓRIAS:\n" +
                "- Use APENAS informações presentes no contexto abaixo.\n" +
                "- NÃO invente, pressuponha ou adicione informações que não estejam no texto.\n" +
                "- Formato: array JSON com objetos contendo 'question', 'options' (A/B/C/D) e 'correctAnswer'.\n" +
                "- Retorne estritamente um array JSON sem formatação markdown (sem ```json).\n\n" +
                "Contexto de Estudos:\n" + contextText;
    }

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
     * Finaliza a simulação e calcula a pontuação real dinâmica do simulado.
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
        boolean isTimedOut = now.isAfter(simulation.getStartTime().plusMinutes(15).plusSeconds(30));
        SimulationStatus finalStatus = isTimedOut ? SimulationStatus.TIMED_OUT : SimulationStatus.COMPLETED;

        int correctCount = 0;
        int totalQuestions = 1;

        try {
            List<Map<String, Object>> questions = objectMapper.readValue(
                    simulation.getContentJson(),
                    new TypeReference<>() {}
            );

            if (questions != null && !questions.isEmpty()) {
                totalQuestions = questions.size();

                for (int i = 0; i < questions.size(); i++) {
                    Map<String, Object> question = questions.get(i);
                    String correctAnswer = (String) question.get("correctAnswer");
                    String studentAnswer = answers != null ? answers.get(i) : null;

                    if (correctAnswer != null && studentAnswer != null) {
                        if (correctAnswer.equalsIgnoreCase(studentAnswer)) {
                            correctCount++;
                        } else if (question.get("correctAlternativeIndex") != null) {
                            try {
                                int correctIdx = ((Number) question.get("correctAlternativeIndex")).intValue();
                                if (Integer.toString(correctIdx).equals(studentAnswer)) {
                                    correctCount++;
                                }
                            } catch (Exception ignored) {}
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Falha ao analisar JSON das questões no encerramento do simulado ID: {}", simulationId, e);
        }

        // CÁLCULO DINÂMICO DE SCORE (Nunca fixo por 3.0)
        int score = (int) Math.round((double) correctCount / (double) totalQuestions * 100);

        simulation.setEndTime(now);
        simulation.setScore(score);
        simulation.setStatus(finalStatus);

        ExamSimulation saved = examSimulationRepository.save(simulation);
        saved = examSimulationRepository.findByIdWithExamPrep(saved.getId()).orElse(saved);
        log.info("Simulado ID: {} finalizado com status: {} e Score: {} ({} de {} acertos)",
                simulationId, finalStatus, score, correctCount, totalQuestions);

        var cache = cacheManager.getCache("leaderboard");
        if (cache != null) {
            cache.evict(simulation.getExamPrep().getId());
        }

        eventPublisher.publishEvent(new ExamPrepActivityEvent(this, simulation.getExamPrep().getId()));

        return toResponseDTO(saved);
    }
}
