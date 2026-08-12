package com.studyplatform.shared.security;

import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SecurityService {

    private final UserRepository userRepository;

    public User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof User user) {
            return userRepository.getReferenceById(user.getId());
        }
        throw new ResourceNotFoundException("Usuário autenticado não encontrado");
    }
}
