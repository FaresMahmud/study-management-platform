package com.studyplatform.shared.config;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Filtro de Rate Limiting para mitigar ataques de força bruta e abuso de recursos (ex: endpoints de IA).
 * Implementa o algoritmo Token Bucket em memória por IP do cliente.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, TokenBucket> ipBuckets = new ConcurrentHashMap<>();

    // Limite padrão geral: 200 requisições por minuto por IP
    private static final int GENERAL_LIMIT = 200;
    // Limite estrito (Auth e IA): 20 requisições por minuto por IP
    private static final int STRICT_LIMIT = 20;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String ip = getClientIp(request);
        String uri = request.getRequestURI();

        // Endpoints sensíveis têm limites mais restritivos
        boolean isStrictRoute = uri.contains("/api/auth/") || uri.contains("/api/ai/") || uri.contains("/api/v1/auth/") || uri.contains("/api/v1/ai/");
        int limit = isStrictRoute ? STRICT_LIMIT : GENERAL_LIMIT;

        TokenBucket bucket = ipBuckets.computeIfAbsent(ip, k -> new TokenBucket(limit));

        if (!bucket.tryConsume()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                "{\"status\": 429, " +
                "\"error\": \"Too Many Requests\", " +
                "\"message\": \"Limite de requisições excedido. Por favor, aguarde antes de tentar novamente.\", " +
                "\"timestamp\": \"" + java.time.LocalDateTime.now() + "\"}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }

    /**
     * Classe interna thread-safe que gerencia o balde de tokens para um IP.
     */
    private static class TokenBucket {
        private final int capacity;
        private double tokens;
        private long lastRefillTime;

        public TokenBucket(int capacity) {
            this.capacity = capacity;
            this.tokens = capacity;
            this.lastRefillTime = System.nanoTime();
        }

        public synchronized boolean tryConsume() {
            refill();
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.nanoTime();
            double elapsedSeconds = (now - lastRefillTime) / 1e9;
            // Adiciona tokens proporcionalmente para encher o balde em 60 segundos
            double tokensToAdd = elapsedSeconds * (capacity / 60.0);
            if (tokensToAdd > 0) {
                tokens = Math.min(capacity, tokens + tokensToAdd);
                lastRefillTime = now;
            }
        }
    }
}
