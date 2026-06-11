package com.studyplatform.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

// Entidade de usuário. Também implementa UserDetails pra integrar direto com o Spring Security,
// sem precisar de uma classe de wrapper separada.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nameUser", nullable = false)
    private String nameUser;

    // Email é o identificador único — usado como "username" no Spring Security.
    @Column(name = "email", nullable = false, unique = true)
    private String email;

    // Senha sempre armazenada como hash BCrypt, nunca em texto puro.
    @Column(name = "passwordUser", nullable = false)
    private String passwordUser;

    // Preenchida automaticamente antes de salvar, nunca atualizada depois.
    @Column(name = "creationDate", nullable = false, updatable = false)
    private LocalDateTime creationDate;

    @PrePersist
    public void prePersist() {
        this.creationDate = LocalDateTime.now();
    }

    // --- UserDetails (Spring Security) ---

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Sem sistema de roles por enquanto — lista vazia
        return List.of();
    }

    @Override
    public String getPassword() {
        return this.passwordUser;
    }

    @Override
    public String getUsername() {
        return this.email;
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}
