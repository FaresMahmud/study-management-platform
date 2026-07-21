package com.studyplatform.examprep;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller responsável por expor APIs de registro de tentativas de quizzes.
 */
@RestController
@RequestMapping("/api/v1/quiz")
@RequiredArgsConstructor
@Tag(name = "Quiz", description = "APIs de registro e avaliação de quizzes")
public class QuizController {

    private final QuizAttemptService quizAttemptService;

    @Operation(summary = "Registrar tentativa de quiz", description = "Grava os resultados obtidos em um quiz de estudos e atualiza a maestria")
    @PostMapping("/attempt")
    public ResponseEntity<QuizAttempt> saveAttempt(@RequestBody QuizAttemptRequest request) {
        QuizAttempt attempt = quizAttemptService.saveAttempt(
                request.getExamPrepId(),
                request.getCorrectAnswers(),
                request.getTotalQuestions(),
                request.getContentJson()
        );
        return ResponseEntity.ok(attempt);
    }
}
