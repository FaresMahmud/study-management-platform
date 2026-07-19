package com.studyplatform.auth;
import com.studyplatform.auth.dto.AuthResponseDTO;
import com.studyplatform.auth.dto.LoginRequestDTO;
import com.studyplatform.auth.dto.RegisterRequestDTO;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.exception.GlobalExceptionHandler;
import com.studyplatform.shared.security.JwtService;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

// Lógica de registro e login. O controller só delega pra cá.
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    // Cria o usuário, salva no banco e já retorna o token pra não precisar fazer login separado.
    public AuthResponseDTO register(RegisterRequestDTO request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Este email já está cadastrado");
        }

        User user = User.builder()
                .nameUser(request.getNameUser())
                .email(request.getEmail())
                .passwordUser(passwordEncoder.encode(request.getPassword()))
                .build();

        User savedUser = userRepository.save(user);
        String token = jwtService.generateToken(savedUser);

        return buildAuthResponse(token, savedUser);
    }

    // O AuthenticationManager verifica email + senha (via BCrypt).
    // Se falhar, lança BadCredentialsException — capturada pelo GlobalExceptionHandler.
    public AuthResponseDTO login(LoginRequestDTO request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        String token = jwtService.generateToken(user);

        return buildAuthResponse(token, user);
    }

    private AuthResponseDTO buildAuthResponse(String token, User user) {
        return AuthResponseDTO.builder()
                .token(token)
                .tokenType("Bearer")
                .id(user.getId())
                .nameUser(user.getNameUser())
                .email(user.getEmail())
                .premium(user.getPremium())
                .build();
    }
}
