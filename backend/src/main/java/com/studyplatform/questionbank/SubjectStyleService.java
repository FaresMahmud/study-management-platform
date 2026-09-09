package com.studyplatform.questionbank;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplatform.examprep.ExamPrep;
import com.studyplatform.examprep.QuestionGenerator;
import com.studyplatform.file.PdfChunk;
import com.studyplatform.file.PdfChunkRepository;
import com.studyplatform.questionbank.dto.StyleProfileDTO;
import com.studyplatform.subject.Subject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubjectStyleService {

    private final SubjectStyleProfileRepository subjectStyleProfileRepository;
    private final PdfChunkRepository pdfChunkRepository;
    private final QuestionGenerator questionGenerator;
    private final ObjectMapper objectMapper;

    // Padrões para detecção de exercícios no texto
    private static final List<Pattern> EXERCISE_PATTERNS = List.of(
            Pattern.compile("(?i)(?:assinale\\s+a\\s+(?:alternativa|op[çc][ãa]o)|julgue\\s+o[s]?\\s+item|julgue\\s+o[s]?\\s+itens)"),
            Pattern.compile("(?i)\\(\\s*\\)\\s*certo\\s*\\(\\s*\\)\\s*errado"),
            Pattern.compile("(?i)\\bquest[ãa]o\\s+\\d+"),
            Pattern.compile("(?i)[(]?\\s*[a-e]\\s*[)]\\s+[^\\n]+"),
            Pattern.compile("(?i)\\b[a-e]\\s*[-–.]\\s+[^\\n]+"),
            Pattern.compile("(?i)\\((?:CESPE|CEBRASPE|FCC|FGV|VUNESP|ENEM|FUVEST|UNICAMP|QUADRIX)\\)")
    );

    @Transactional
    public SubjectStyleProfile getOrCreateStyleProfile(Subject subject, boolean forceRegenerate) {
        Optional<SubjectStyleProfile> existingOpt = subjectStyleProfileRepository.findBySubjectId(subject.getId());

        if (existingOpt.isPresent() && !forceRegenerate && !existingOpt.get().isNeedsRegeneration()) {
            return existingOpt.get();
        }

        List<PdfChunk> chunks = pdfChunkRepository.findByUploadedFileSubjectId(subject.getId());
        List<String> exerciseSamples = detectExerciseSamples(chunks);

        SubjectStyleProfile profile = existingOpt.orElseGet(() -> SubjectStyleProfile.builder()
                .subject(subject)
                .build());

        if (exerciseSamples.size() >= 3 && questionGenerator.isConfigured()) {
            try {
                StyleProfileDTO extracted = extractStyleWithGemini(exerciseSamples);
                profile.setProfileJson(objectMapper.writeValueAsString(extracted));
                profile.setDetectionSource(DetectionSource.EXTRACTED_FROM_MATERIAL);
                profile.setSampleExercisesFound(exerciseSamples.size());
                profile.setNeedsRegeneration(false);
                profile.setGeneratedAt(LocalDateTime.now());
                log.info("Perfil de estilo extraído com sucesso para a matéria {}: {}", subject.getSubjectName(), extracted.getFonteDetectada());
                return subjectStyleProfileRepository.save(profile);
            } catch (Exception e) {
                log.warn("Falha ao analisar estilo via IA para matéria {}. Aplicando perfil default.", subject.getSubjectName(), e);
            }
        }

        // Fallback: perfil default baseado no tipo de exame
        StyleProfileDTO defaultProfile = buildDefaultProfile(subject);
        try {
            profile.setProfileJson(objectMapper.writeValueAsString(defaultProfile));
        } catch (Exception ex) {
            profile.setProfileJson("{}");
        }
        profile.setDetectionSource(DetectionSource.DEFAULT_BY_EXAM_TYPE);
        profile.setSampleExercisesFound(exerciseSamples.size());
        profile.setNeedsRegeneration(false);
        profile.setGeneratedAt(LocalDateTime.now());
        log.info("Perfil de estilo padrão aplicado para matéria {}: {}", subject.getSubjectName(), defaultProfile.getFonteDetectada());
        return subjectStyleProfileRepository.save(profile);
    }

    public StyleProfileDTO parseProfileJson(String json) {
        try {
            if (json == null || json.isBlank()) return buildDefaultProfile(null);
            return objectMapper.readValue(json, StyleProfileDTO.class);
        } catch (Exception e) {
            log.error("Erro ao converter profileJson para DTO", e);
            return buildDefaultProfile(null);
        }
    }

    public List<String> detectExerciseSamples(List<PdfChunk> chunks) {
        List<String> samples = new ArrayList<>();
        if (chunks == null || chunks.isEmpty()) {
            return samples;
        }

        for (PdfChunk chunk : chunks) {
            String text = chunk.getChunkText();
            if (text == null || text.isBlank()) continue;

            int matchCount = 0;
            for (Pattern pattern : EXERCISE_PATTERNS) {
                if (pattern.matcher(text).find()) {
                    matchCount++;
                }
            }

            // Se o chunk casa com ao menos um padrão de exercício forte
            if (matchCount >= 1) {
                samples.add(text);
                if (samples.size() >= 10) {
                    break;
                }
            }
        }
        return samples;
    }

    private StyleProfileDTO extractStyleWithGemini(List<String> samples) throws Exception {
        String samplesText = samples.stream()
                .limit(10)
                .map(s -> "---\n" + s.trim())
                .collect(Collectors.joining("\n"));

        String prompt = "Você é um especialista sênior em análise de bancas examinadoras e materiais didáticos de estudo para concursos, vestibulares e exames.\n" +
                "Analise os seguintes trechos de exercícios extraídos do material de estudo e monte o perfil de estilo das questões.\n\n" +
                "REGRAS ESTRITAS:\n" +
                "- Retorne ESTRITAMENTE um objeto JSON válido, sem formatação markdown (sem ```json e sem ```).\n" +
                "- O formato DEVE ser um dos seguintes valores exatos:\n" +
                "  * 'certo_errado' (se as questões forem afirmativas para julgar Certo ou Errado, como CESPE/Cebraspe)\n" +
                "  * 'multipla_escolha_4' (se houver 4 alternativas: A, B, C, D)\n" +
                "  * 'multipla_escolha_5' (se houver 5 alternativas: A, B, C, D, E)\n" +
                "  * 'discursiva' (se forem perguntas abertas)\n" +
                "- No campo 'fonte_detectada', indique a banca ou modelo (ex: 'CESPE / Cebraspe', 'FCC', 'FGV', 'ENEM', 'VUNESP' ou 'Banca Desconhecida').\n\n" +
                "Estrutura JSON obrigatória:\n" +
                "{\n" +
                "  \"fonte_detectada\": \"CESPE | FCC | FGV | ENEM | VUNESP | banca desconhecida | nenhuma\",\n" +
                "  \"formato\": \"multipla_escolha_4 | multipla_escolha_5 | certo_errado | discursiva\",\n" +
                "  \"comando_padrao\": \"Exemplo de comando típico (ex: 'Assinale a alternativa correta.' ou 'Julgue os itens a seguir.')\",\n" +
                "  \"estilo_enunciado\": \"Descrição concisa do estilo (ex: assertivas conceituais diretas, casos práticos contextualizados, etc.)\",\n" +
                "  \"dificuldade_media\": \"facil | media | dificil\",\n" +
                "  \"padroes_observados\": [\"alternativas longas\", \"usa exceto\", \"assertivas curtas\"]\n" +
                "}\n\n" +
                "Trechos de Exercícios do Material:\n" + samplesText;

        String rawResponse = questionGenerator.generateContent(prompt);
        String cleaned = cleanJson(rawResponse);
        return objectMapper.readValue(cleaned, StyleProfileDTO.class);
    }

    public StyleProfileDTO buildDefaultProfile(Subject subject) {
        String examTitle = "";
        if (subject != null && subject.getExamPrep() != null && subject.getExamPrep().getTitle() != null) {
            examTitle = subject.getExamPrep().getTitle().toLowerCase();
        } else if (subject != null && subject.getSubjectName() != null) {
            examTitle = subject.getSubjectName().toLowerCase();
        }

        if (examTitle.contains("cespe") || examTitle.contains("cebraspe")) {
            return StyleProfileDTO.builder()
                    .fonteDetectada("CESPE / Cebraspe")
                    .formato("certo_errado")
                    .comandoPadrao("Julgue o item a seguir.")
                    .estiloEnunciado("Itens assertivos curtos e conceituais avaliados como Certo ou Errado.")
                    .dificuldadeMedia("dificil")
                    .padroesObservados(List.of("assertivas diretas", "itens de certo/errado", "penalização de chute"))
                    .build();
        }

        if (examTitle.contains("enem") || examTitle.contains("vestibular")) {
            return StyleProfileDTO.builder()
                    .fonteDetectada("ENEM / Vestibular")
                    .formato("multipla_escolha_5")
                    .comandoPadrao("Com base no texto, assinale a opção correta.")
                    .estiloEnunciado("Questões interdisciplinares com textos de apoio e situações do cotidiano.")
                    .dificuldadeMedia("media")
                    .padroesObservados(List.of("textos de apoio", "5 alternativas A-E", "análise crítica"))
                    .build();
        }

        if (examTitle.contains("oab")) {
            return StyleProfileDTO.builder()
                    .fonteDetectada("OAB (FGV)")
                    .formato("multipla_escolha_4")
                    .comandoPadrao("Acerca da situação hipotética narrada, assinale a afirmativa correta.")
                    .estiloEnunciado("Casos concretos e aplicação da legislação e jurisprudência.")
                    .dificuldadeMedia("dificil")
                    .padroesObservados(List.of("caso prático extenso", "4 alternativas A-D", "jurisprudência"))
                    .build();
        }

        if (examTitle.contains("concurso") || examTitle.contains("tjsp") || examTitle.contains("policia")
                || examTitle.contains("inss") || examTitle.contains("tribunal") || examTitle.contains("fiscal")) {
            return StyleProfileDTO.builder()
                    .fonteDetectada("Banca de Concurso (Padrão)")
                    .formato("multipla_escolha_4")
                    .comandoPadrao("Assinale a alternativa correta.")
                    .estiloEnunciado("Enunciados diretos com alternativas objetivas cobrando letra da lei e conceitos teóricos.")
                    .dificuldadeMedia("media")
                    .padroesObservados(List.of("letra da lei", "4 alternativas A-D", "pegadinhas gramaticais"))
                    .build();
        }

        return StyleProfileDTO.builder()
                .fonteDetectada("Padrão Acadêmico")
                .formato("multipla_escolha_5")
                .comandoPadrao("Assinale a alternativa correta.")
                .estiloEnunciado("Questões teóricas diretas de fixação do conteúdo abordado.")
                .dificuldadeMedia("media")
                .padroesObservados(List.of("5 alternativas A-E", "revisão de conceitos"))
                .build();
    }

    private String cleanJson(String raw) {
        if (raw == null) return "{}";
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
