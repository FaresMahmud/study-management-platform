package com.studyplatform.security;

import com.studyplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

// Implementação do UserDetailsService exigido pelo Spring Security.
// O Spring chama loadUserByUsername sempre que precisa verificar quem está fazendo a requisição.
// Como o User já implementa UserDetails, devolve ele direto sem precisar de wrapper.
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    // Aqui "username" é o email — é assim que configuramos a autenticação.
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Usuário não encontrado com o email: " + email
                ));
    }
}
