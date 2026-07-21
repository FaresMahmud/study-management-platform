package com.studyplatform.examprep;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExamPrepActivityListener {

    private final QuizAttemptService quizAttemptService;

    @Async
    @EventListener
    public void handleExamPrepActivity(ExamPrepActivityEvent event) {
        log.info("Recebido evento de atividade para a preparação ID: {} - Iniciando recálculo assíncrono...", event.getExamPrepId());
        try {
            quizAttemptService.recalcularMastery(event.getExamPrepId());
        } catch (Exception e) {
            log.error("Falha ao recalcular maestria de forma assíncrona para a preparação ID: {}", event.getExamPrepId(), e);
        }
    }
}
