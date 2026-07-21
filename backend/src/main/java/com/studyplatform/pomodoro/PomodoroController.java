package com.studyplatform.pomodoro;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pomodoro")
@RequiredArgsConstructor
@Tag(name = "Pomodoro", description = "APIs de controle do timer Pomodoro e sessões de foco")
public class PomodoroController {

    private final PomodoroSessionService pomodoroSessionService;

    @Operation(summary = "Iniciar timer de foco", description = "Gera uma nova sessão Pomodoro com o tempo especificado (padrão 25 minutos)")
    @PostMapping("/start")
    public ResponseEntity<PomodoroSession> start(
            @RequestParam Long examPrepId,
            @RequestParam(required = false, defaultValue = "25") Integer duration) {
        PomodoroSession session = pomodoroSessionService.startSession(examPrepId, duration);
        return ResponseEntity.ok(session);
    }

    @Operation(summary = "Completar timer de foco", description = "Marca a sessão Pomodoro como concluída com sucesso e registra o material estudado")
    @PostMapping("/complete/{id}")
    public ResponseEntity<PomodoroSession> complete(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String content = body != null ? body.get("contentConsumed") : null;
        PomodoroSession session = pomodoroSessionService.completeSession(id, content);
        return ResponseEntity.ok(session);
    }

    @Operation(summary = "Listar sessões de foco", description = "Retorna o histórico de sessões Pomodoro concluídas para a preparação selecionada")
    @GetMapping("/list")
    public ResponseEntity<List<PomodoroSession>> list(@RequestParam Long examPrepId) {
        List<PomodoroSession> sessions = pomodoroSessionService.getSessions(examPrepId);
        return ResponseEntity.ok(sessions);
    }
}
