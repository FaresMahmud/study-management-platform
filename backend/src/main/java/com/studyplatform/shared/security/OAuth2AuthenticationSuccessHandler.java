package com.studyplatform.shared.security;

import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        
        if (name == null) {
            name = oAuth2User.getAttribute("login"); // Para o GitHub
        }
        if (email == null) {
            email = oAuth2User.getAttribute("login") + "@github.com"; // Fallback para GitHub sem email público
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = User.builder()
                    .nameUser(name != null ? name : "Social User")
                    .email(email)
                    .passwordUser(UUID.randomUUID().toString()) // Senha randômica para logins sociais
                    .build();
            user = userRepository.save(user);
        } else {
            user.setNameUser(name != null ? name : user.getNameUser());
            user = userRepository.save(user);
        }

        String token = jwtService.generateToken(user);

        // Redireciona de volta para o frontend com o token JWT
        String targetUrl = "http://localhost:5173/oauth2/redirect?token=" + token;
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
