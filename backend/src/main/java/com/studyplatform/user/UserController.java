package com.studyplatform.user;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Usuários", description = "Endpoints de gerenciamento e upgrade de planos do estudante")
public class UserController {

    private final UserRepository userRepository;

    @Operation(summary = "Fazer upgrade para plano Premium", description = "Simula a assinatura do plano Premium e atualiza o status no banco")
    @PostMapping("/upgrade")
    public ResponseEntity<Map<String, Object>> upgradeToPremium() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        user.setPremium(true);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Assinatura premium ativada com sucesso! 💎",
                "premium", true
        ));
    }
}
