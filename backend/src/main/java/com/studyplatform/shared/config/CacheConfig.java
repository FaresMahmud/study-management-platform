package com.studyplatform.shared.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    @Primary
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        try {
            // Testa conexão rapidamente
            connectionFactory.getConnection().close();

            log.info("Redis encontrado! Configurando RedisCacheManager...");

            // Configuração padrão: 1 hora de expiração
            RedisCacheConfiguration defaultCacheConfig = RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofHours(1))
                    .disableCachingNullValues();

            // Configurações personalizadas por cache
            Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
            
            // Sessões de estudo: 1 hora
            cacheConfigurations.put("studySessions", RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofHours(1)));
            
            // Leaderboard / Analytics de Progresso: 5 minutos
            cacheConfigurations.put("leaderboard", RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofMinutes(5)));
            
            // Conteúdo Inteligente (resumos e quizzes gerados): 24 horas
            cacheConfigurations.put("aiContent", RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofHours(24)));

            return RedisCacheManager.builder(connectionFactory)
                    .cacheDefaults(defaultCacheConfig)
                    .withInitialCacheConfigurations(cacheConfigurations)
                    .build();
        } catch (Exception e) {
            log.warn("Não foi possível conectar ao Redis (serviço inativo ou offline). Usando Simple Cache (In-Memory) como fallback.");
            return new ConcurrentMapCacheManager("studySessions", "leaderboard", "aiContent");
        }
    }
}
