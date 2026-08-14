package com.studyplatform.shared.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class DatabaseSchemaFixer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseSchemaFixer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        log.info("Iniciando verificação de compatibilidade de esquema da tabela 'goals'...");
        try {
            // Tenta sintaxe do MySQL para tornar a coluna nullable
            jdbcTemplate.execute("ALTER TABLE goals MODIFY COLUMN objective_hours DOUBLE PRECISION NULL");
            log.info("Esquema da tabela 'goals' (MySQL) corrigido com sucesso!");
        } catch (Exception e) {
            try {
                // Tenta sintaxe do PostgreSQL como fallback
                jdbcTemplate.execute("ALTER TABLE goals ALTER COLUMN objective_hours DROP NOT NULL");
                log.info("Esquema da tabela 'goals' (PostgreSQL) corrigido com sucesso!");
            } catch (Exception ex) {
                log.warn("Aviso: Não foi possível alterar a coluna objective_hours. Ela já deve ser nullable ou não existe. Mensagem: {}", ex.getMessage());
            }
        }
    }
}
