package com.studyplatform.questionbank;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplatform.examprep.QuestionGenerator;
import com.studyplatform.file.PdfChunk;
import com.studyplatform.file.PdfChunkRepository;
import com.studyplatform.questionbank.dto.QuestionGenerationJobResponseDTO;
import com.studyplatform.questionbank.dto.StyleProfileDTO;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionGenerationJobService {

    private final QuestionGenerationJobRepository jobRepository;
    private final QuestionBankItemRepository questionBankItemRepository;
    private final SubjectRepository subjectRepository;
    private final PdfChunkRepository pdfChunkRepository;
    private final SubjectStyleService subjectStyleService;
    private final QuestionGenerator questionGenerator;
    private final ObjectMapper objectMapper;

    @Transactional
    public QuestionGenerationJobResponseDTO startJob(Long subjectId, Integer count, boolean regenerateStyle) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Matéria não encontrada com ID: " + subjectId));

        int targetCount = (count == null || count <= 0) ? 10 : Math.min(count, 30);

        String jobId = UUID.randomUUID().toString();
        QuestionGenerationJob job = QuestionGenerationJob.builder()
                .id(jobId)
                .subject(subject)
                .requestedCount(targetCount)
                .generatedCount(0)
                .status(JobStatus.PENDING)
                .build();

        QuestionGenerationJob saved = jobRepository.save(job);
        log.info("Job de geração de questões iniciado. ID: {}, Matéria: {}, Quantidade: {}", jobId, subjectId, targetCount);

        // Dispara execução assíncrona
        processJobAsync(jobId, regenerateStyle);

        return toResponseDTO(saved, null);
    }

    @Async
    public void processJobAsync(String jobId, boolean regenerateStyle) {
        log.info("Iniciando processamento assíncrono do job ID: {}", jobId);
        Optional<QuestionGenerationJob> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            log.error("Job ID {} não encontrado para execução assíncrona.", jobId);
            return;
        }

        QuestionGenerationJob job = jobOpt.get();
        Subject subject = job.getSubject();

        try {
            // ==================== PASSO A: Perfil de Estilo ====================
            job.setStatus(JobStatus.ANALYZING_STYLE);
            jobRepository.save(job);

            SubjectStyleProfile profile = subjectStyleService.getOrCreateStyleProfile(subject, regenerateStyle);
            job.setStyleProfileJson(profile.getProfileJson());
            StyleProfileDTO styleDto = subjectStyleService.parseProfileJson(profile.getProfileJson());

            // ==================== PASSO B: Geração em Lotes ====================
            job.setStatus(JobStatus.GENERATING);
            jobRepository.save(job);

            List<PdfChunk> chunks = pdfChunkRepository.findByUploadedFileSubjectId(subject.getId());
            if (chunks.isEmpty()) {
                throw new BusinessException("A matéria não possui material PDF indexado para elaboração de questões.");
            }

            // Busca questões recentes para regra anti-repetição
            List<String> existingQuestions = questionBankItemRepository.findRecentQuestionTextsBySubjectId(
                    subject.getId(), PageRequest.of(0, 50));

            int remaining = job.getRequestedCount();
            int chunkOffset = 0;

            while (remaining > 0) {
                int currentBatchSize = Math.min(5, remaining);
                log.info("Gerando lote de {} questões para o job ID: {} (restantes: {})", currentBatchSize, jobId, remaining);

                // Seleciona uma janela de chunks representativa
                List<PdfChunk> batchChunks = selectBatchChunks(chunks, chunkOffset, 8);
                chunkOffset = (chunkOffset + 8) % Math.max(1, chunks.size());

                boolean batchSuccess = false;
                int retryCount = 0;

                while (!batchSuccess && retryCount < 2) {
                    try {
                        List<Map<String, Object>> generatedItems = generateBatch(
                                subject, styleDto, batchChunks, existingQuestions, currentBatchSize);

                        if (generatedItems != null && !generatedItems.isEmpty()) {
                            for (Map<String, Object> itemMap : generatedItems) {
                                saveQuestionBankItem(subject, profile, itemMap, batchChunks);
                                job.setGeneratedCount(job.getGeneratedCount() + 1);
                                existingQuestions.add((String) itemMap.get("question_text"));
                            }
                            batchSuccess = true;
                            remaining -= generatedItems.size();
                            jobRepository.save(job);
                        } else {
                            retryCount++;
                        }
                    } catch (Exception batchEx) {
                        retryCount++;
                        log.warn("Erro no lote do job ID: {} (tentativa {}/2): {}", jobId, retryCount, batchEx.getMessage());
                        if (retryCount >= 2 && job.getGeneratedCount() == 0) {
                            throw batchEx; // Se não gerou nada e esgotou retries, falha o job
                        }
                    }
                }

                if (!batchSuccess && job.getGeneratedCount() > 0) {
                    log.warn("Lote falhou após retries, mas {} questões já foram salvas. Encerrando job.", job.getGeneratedCount());
                    break;
                }
            }

            job.setStatus(JobStatus.DONE);
            job.setFinishedAt(LocalDateTime.now());
            jobRepository.save(job);
            log.info("Job ID: {} concluído com sucesso. {} questões salvas no banco da matéria {}.",
                    jobId, job.getGeneratedCount(), subject.getSubjectName());

        } catch (Exception ex) {
            log.error("Falha ao processar job ID: {}", jobId, ex);
            job.setStatus(JobStatus.FAILED);
            job.setErrorMessage(ex.getMessage() != null ? ex.getMessage() : "Erro interno durante geração com IA.");
            job.setFinishedAt(LocalDateTime.now());
            jobRepository.save(job);
        }
    }

    private List<PdfChunk> selectBatchChunks(List<PdfChunk> chunks, int offset, int count) {
        if (chunks == null || chunks.isEmpty()) return Collections.emptyList();
        int size = chunks.size();
        List<PdfChunk> result = new ArrayList<>();
        for (int i = 0; i < Math.min(count, size); i++) {
            result.add(chunks.get((offset + i) % size));
        }
        return result;
    }

    private List<Map<String, Object>> generateBatch(
            Subject subject,
            StyleProfileDTO styleDto,
            List<PdfChunk> chunks,
            List<String> existingQuestions,
            int batchSize
    ) throws Exception {

        String contextText = chunks.stream()
                .map(PdfChunk::getChunkText)
                .filter(Objects::nonNull)
                .collect(Collectors.joining("\n\n"));

        String antiRepeatBlock = existingQuestions.isEmpty() ? "" :
                "\nQUESTÕES JÁ EXISTENTES NO BANCO (NÃO repita nem formule variações óbvias destas questões):\n" +
                        existingQuestions.stream().limit(25).map(q -> "- " + q).collect(Collectors.joining("\n")) + "\n";

        String formatInstructions;
        String formatName = styleDto.getFormato() != null ? styleDto.getFormato().toLowerCase() : "multipla_escolha_5";

        if (formatName.contains("certo") || formatName.contains("true_false")) {
            formatInstructions = "- FORMATO CERTO/ERRADO (Estilo CESPE):\n" +
                    "  * Cada item deve ser uma assertiva com comando padrão '" + (styleDto.getComandoPadrao() != null ? styleDto.getComandoPadrao() : "Julgue o item a seguir.") + "'.\n" +
                    "  * O campo 'alternatives' DEVE conter estritamente: [\"Certo\", \"Errado\"].\n" +
                    "  * 'correct_alternative_index' DEVE ser 0 (se Certo) ou 1 (se Errado).\n" +
                    "  * 'format' deve ser 'TRUE_FALSE'.\n";
        } else if (formatName.contains("4")) {
            formatInstructions = "- FORMATO MÚLTIPLA ESCOLHA COM 4 ALTERNATIVAS (A–D):\n" +
                    "  * O campo 'alternatives' DEVE conter 4 strings: [\"A) ...\", \"B) ...\", \"C) ...\", \"D) ...\"].\n" +
                    "  * 'correct_alternative_index' DEVE ser entre 0 e 3.\n" +
                    "  * 'format' deve ser 'MULTIPLE_CHOICE_4'.\n";
        } else {
            formatInstructions = "- FORMATO MÚLTIPLA ESCOLHA COM 5 ALTERNATIVAS (A–E):\n" +
                    "  * O campo 'alternatives' DEVE conter 5 strings: [\"A) ...\", \"B) ...\", \"C) ...\", \"D) ...\", \"E) ...\"].\n" +
                    "  * 'correct_alternative_index' DEVE ser entre 0 e 4.\n" +
                    "  * 'format' deve ser 'MULTIPLE_CHOICE_5'.\n";
        }

        String prompt = "Você é um elaborador de questões de alto nível para a banca/modelo: " + styleDto.getFonteDetectada() + ".\n" +
                "Elabore EXATAMENTE " + batchSize + " questões inéditas baseando-se no material teórico fornecido.\n\n" +
                "PERFIL DE ESTILO A SEGUIR:\n" +
                "- Fonte/Banca: " + styleDto.getFonteDetectada() + "\n" +
                "- Comando Padrão: " + styleDto.getComandoPadrao() + "\n" +
                "- Estilo do Enunciado: " + styleDto.getEstiloEnunciado() + "\n" +
                "- Dificuldade: " + styleDto.getDificuldadeMedia() + "\n\n" +
                formatInstructions + "\n" +
                "REGRAS OBRIGATÓRIAS:\n" +
                "1. Baseie-se ESTRITAMENTE nos conceitos do conteúdo abaixo.\n" +
                "2. As alternativas incorretas (distratores) devem ser verossímeis e desafiadoras.\n" +
                "3. Para cada questão inclua 'explanation' (justificativa didática clara) e 'topic_hint' (nome do tópico abordado).\n" +
                "4. Retorne ESTRITAMENTE um array JSON contendo os objetos das questões, sem formatação markdown (sem ```json).\n" +
                antiRepeatBlock + "\n" +
                "CONTRATO DO JSON:\n" +
                "[\n" +
                "  {\n" +
                "    \"question_text\": \"Enunciado completo...\",\n" +
                "    \"format\": \"TRUE_FALSE | MULTIPLE_CHOICE_4 | MULTIPLE_CHOICE_5\",\n" +
                "    \"alternatives\": [\"...\"],\n" +
                "    \"correct_alternative_index\": 0,\n" +
                "    \"explanation\": \"Justificativa detalhada...\",\n" +
                "    \"topic_hint\": \"Tópico abordado\"\n" +
                "  }\n" +
                "]\n\n" +
                "MATERIAL TEÓRICO DE ESTUDO:\n" + contextText;

        String responseRaw = questionGenerator.generateContent(prompt);
        String cleaned = cleanJson(responseRaw);
        return objectMapper.readValue(cleaned, new TypeReference<List<Map<String, Object>>>() {});
    }

    private void saveQuestionBankItem(Subject subject, SubjectStyleProfile profile, Map<String, Object> map, List<PdfChunk> chunks) {
        String questionText = (String) map.get("question_text");
        if (questionText == null || questionText.isBlank()) return;

        Object altsObj = map.get("alternatives");
        List<String> alternatives = new ArrayList<>();
        if (altsObj instanceof List<?>) {
            for (Object o : (List<?>) altsObj) {
                if (o != null) alternatives.add(o.toString());
            }
        }

        int correctIndex = 0;
        if (map.get("correct_alternative_index") instanceof Number) {
            correctIndex = ((Number) map.get("correct_alternative_index")).intValue();
        }
        if (correctIndex < 0 || (!alternatives.isEmpty() && correctIndex >= alternatives.size())) {
            correctIndex = 0;
        }

        String formatStr = (String) map.get("format");
        QuestionFormat format = resolveFormat(formatStr, alternatives.size());

        String explanation = (String) map.get("explanation");
        String topicHint = (String) map.get("topic_hint");

        List<Long> fileIds = chunks.stream()
                .map(c -> c.getUploadedFile() != null ? c.getUploadedFile().getId() : null)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        String sourceFileIdsJson = "[]";
        try {
            sourceFileIdsJson = objectMapper.writeValueAsString(fileIds);
        } catch (Exception ignored) {}

        String alternativesJson = "[]";
        try {
            alternativesJson = objectMapper.writeValueAsString(alternatives);
        } catch (Exception ignored) {}

        QuestionBankItem item = QuestionBankItem.builder()
                .subject(subject)
                .questionText(questionText)
                .format(format)
                .alternatives(alternativesJson)
                .correctAlternativeIndex(correctIndex)
                .explanation(explanation)
                .topicHint(topicHint)
                .styleProfile(profile)
                .sourceFileIds(sourceFileIdsJson)
                .status(QuestionBankStatus.ACTIVE)
                .timesUsed(0)
                .build();

        questionBankItemRepository.save(item);
    }

    private QuestionFormat resolveFormat(String formatStr, int alternativesCount) {
        if (formatStr != null) {
            String upper = formatStr.toUpperCase();
            if (upper.contains("TRUE_FALSE") || upper.contains("CERTO")) return QuestionFormat.TRUE_FALSE;
            if (upper.contains("4")) return QuestionFormat.MULTIPLE_CHOICE_4;
            if (upper.contains("5")) return QuestionFormat.MULTIPLE_CHOICE_5;
            if (upper.contains("DISCURSIVE")) return QuestionFormat.DISCURSIVE;
        }
        if (alternativesCount == 2) return QuestionFormat.TRUE_FALSE;
        if (alternativesCount == 4) return QuestionFormat.MULTIPLE_CHOICE_4;
        return QuestionFormat.MULTIPLE_CHOICE_5;
    }

    @Transactional(readOnly = true)
    public QuestionGenerationJobResponseDTO getJobStatus(String jobId) {
        QuestionGenerationJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job não encontrado com ID: " + jobId));

        StyleProfileDTO profileDto = null;
        if (job.getStyleProfileJson() != null) {
            profileDto = subjectStyleService.parseProfileJson(job.getStyleProfileJson());
        }

        return toResponseDTO(job, profileDto);
    }

    private QuestionGenerationJobResponseDTO toResponseDTO(QuestionGenerationJob job, StyleProfileDTO profileDto) {
        return QuestionGenerationJobResponseDTO.builder()
                .jobId(job.getId())
                .subjectId(job.getSubject() != null ? job.getSubject().getId() : null)
                .requestedCount(job.getRequestedCount())
                .generatedCount(job.getGeneratedCount())
                .status(job.getStatus())
                .errorMessage(job.getErrorMessage())
                .styleProfile(profileDto)
                .createdAt(job.getCreatedAt())
                .finishedAt(job.getFinishedAt())
                .build();
    }

    private String cleanJson(String raw) {
        if (raw == null) return "[]";
        String trimmed = raw.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }
}
