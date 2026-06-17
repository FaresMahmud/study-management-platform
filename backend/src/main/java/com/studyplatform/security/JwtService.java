package com.studyplatform.security;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

// Cuida de tudo relacionado a JWT: gerar, validar e extrair informações dos tokens.
// Usa a API do JJWT 0.12.x — métodos antigos como parserBuilder() e getBody()
// foram removidos nessa versão, por isso usamos parser(), verifyWith() e getPayload().
@Service
public class JwtService {

    @Value("${JWT_SECRET}")
    private String secretKey;

    @Value("${JWT_EXPIRATION}")
    private long jwtExpiration;

    // Gera um token JWT para o usuário. Chamado após login ou registro.
    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    // Versão que aceita claims extras, caso queira incluir mais dados no payload no futuro.
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    // Extrai o email (subject) do token — usado pelo filtro JWT pra identificar o usuário.
    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // Valida se o token pertence ao usuário e não está expirado.
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String email = extractEmail(token);
            return email.equals(userDetails.getUsername()) && !isTokenExpired(token);
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    // Método genérico pra extrair qualquer claim do token sem repetir código.
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // Faz o parse completo do token. Se estiver adulterado ou expirado, o JJWT lança exceção.
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // Converte o secret (String) em uma SecretKey usável pelo JJWT.
    //
    // Segurança/robustez:
    // - Seu JWT_SECRET pode vir como HEX (muito comum em .env) ou como string texto.
    // - HMAC-SHA exige uma chave binária; usar getBytes() diretamente (texto) pode gerar
    //   tamanho/bytes incorretos e quebrar assinatura (causando 500 ao gerar token).
    // - Aqui aceitamos HEX quando o valor parece hex (somente [0-9a-fA-F] e tamanho par).
    //
    // Regra:
    // - Se for HEX -> decodifica
    // - Caso contrário -> usa UTF-8 como fallback
    private SecretKey getSigningKey() {
        String trimmed = secretKey == null ? "" : secretKey.trim();
        if (trimmed.isBlank()) {
            throw new IllegalStateException("JWT_SECRET não configurado (vazio). Configure no ambiente.");
        }

        byte[] keyBytes;
        if (looksLikeHex(trimmed)) {
            // JwtSecret em HEX -> bytes reais
            keyBytes = Decoders.BASE64.decode(trimmed);

        } else {
            // Compatibilidade: secret como texto
            keyBytes = trimmed.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }

        // Keys.hmacShaKeyFor valida tamanho mínimo apropriado para HS256/HS512.
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private boolean looksLikeHex(String value) {
        // HEX válido normalmente tem tamanho par e só caracteres hex
        if (value.length() % 2 != 0) return false;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            boolean isDigit = (c >= '0' && c <= '9');
            boolean isLowerHex = (c >= 'a' && c <= 'f');
            boolean isUpperHex = (c >= 'A' && c <= 'F');
            if (!(isDigit || isLowerHex || isUpperHex)) return false;
        }
        return true;
    }

}
