package com.studyplatform.questionbank;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplatform.questionbank.dto.QuestionBankItemResponseDTO;
import com.studyplatform.questionbank.dto.QuestionBankSummaryDTO;
import com.studyplatform.questionbank.dto.StyleProfileDTO;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionBankService {

    private final QuestionBankItemRepository questionBankItemRepository;
    private final SubjectStyleProfileRepository subjectStyleProfileRepository;
    private final QuestionGenerationJobRepository jobRepository;
    private final SubjectRepository subjectRepository;
    private final SubjectStyleService subjectStyleService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public QuestionBankSummaryDTO getSubjectQuestionBankSummary(Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Matéria não encontrada com ID: " + subjectId));

        long total = questionBankItemRepository.countBySubjectId(subjectId);
        long active = questionBankItemRepository.countBySubjectIdAndStatus(subjectId, QuestionBankStatus.ACTIVE);
        long used = questionBankItemRepository.countBySubjectIdAndStatus(subjectId, QuestionBankStatus.USED);

        Optional<SubjectStyleProfile> profileOpt = subjectStyleProfileRepository.findBySubjectId(subjectId);
        StyleProfileDTO profileDto = null;
        String detectionSource = null;

        if (profileOpt.isPresent()) {
            profileDto = subjectStyleService.parseProfileJson(profileOpt.get().getProfileJson());
            detectionSource = profileOpt.get().getDetectionSource().name();
        } else {
            profileDto = subjectStyleService.buildDefaultProfile(subject);
            detectionSource = DetectionSource.DEFAULT_BY_EXAM_TYPE.name();
        }

        List<QuestionGenerationJob> activeJobs = jobRepository.findBySubjectIdAndStatusIn(
                subjectId, List.of(JobStatus.PENDING, JobStatus.ANALYZING_STYLE, JobStatus.GENERATING));

        boolean isGenerating = !activeJobs.isEmpty();
        String activeJobId = isGenerating ? activeJobs.get(0).getId() : null;

        return QuestionBankSummaryDTO.builder()
                .subjectId(subject.getId())
                .subjectName(subject.getSubjectName())
                .totalQuestions(total)
                .activeQuestions(active)
                .usedQuestions(used)
                .styleProfile(profileDto)
                .detectionSource(detectionSource)
                .isGenerating(isGenerating)
                .activeJobId(activeJobId)
                .build();
    }

    @Transactional
    public List<QuestionBankItem> pickQuestionsForSimulation(Long subjectId, int count) {
        List<QuestionBankItem> activeItems = questionBankItemRepository.findBySubjectIdAndStatusOrderByTimesUsedAsc(
                subjectId, QuestionBankStatus.ACTIVE, PageRequest.of(0, count * 2));

        if (activeItems.isEmpty()) {
            return Collections.emptyList();
        }

        // Embaralha para variar as opções e seleciona até 'count'
        Collections.shuffle(activeItems);
        List<QuestionBankItem> selected = activeItems.stream().limit(count).collect(Collectors.toList());

        for (QuestionBankItem item : selected) {
            item.setTimesUsed(item.getTimesUsed() + 1);
            item.setStatus(QuestionBankStatus.USED);
        }
        questionBankItemRepository.saveAll(selected);
        return selected;
    }

    @Transactional(readOnly = true)
    public List<QuestionBankItemResponseDTO> listItems(Long subjectId, int limit) {
        List<QuestionBankItem> items = questionBankItemRepository.findBySubjectIdOrderByCreatedAtDesc(
                subjectId, PageRequest.of(0, Math.min(limit, 100)));

        return items.stream().map(this::toDTO).collect(Collectors.toList());
    }

    private QuestionBankItemResponseDTO toDTO(QuestionBankItem item) {
        List<String> alts = new ArrayList<>();
        try {
            alts = objectMapper.readValue(item.getAlternatives(), new TypeReference<List<String>>() {});
        } catch (Exception ignored) {}

        return QuestionBankItemResponseDTO.builder()
                .id(item.getId())
                .subjectId(item.getSubject() != null ? item.getSubject().getId() : null)
                .questionText(item.getQuestionText())
                .format(item.getFormat())
                .alternatives(alts)
                .correctAlternativeIndex(item.getCorrectAlternativeIndex())
                .explanation(item.getExplanation())
                .topicHint(item.getTopicHint())
                .status(item.getStatus())
                .timesUsed(item.getTimesUsed())
                .createdAt(item.getCreatedAt())
                .build();
    }
}
