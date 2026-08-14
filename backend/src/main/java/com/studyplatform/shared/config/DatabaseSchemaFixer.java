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
        
        // Corrigindo 'objective_hours' / 'objectiveHours'
        try {
            jdbcTemplate.execute("ALTER TABLE goals MODIFY COLUMN objective_hours DOUBLE PRECISION NULL");
            log.info("Coluna 'objective_hours' (MySQL) corrigida com sucesso!");
        } catch (Exception e) {
            try {
                jdbcTemplate.execute("ALTER TABLE goals MODIFY COLUMN objectiveHours DOUBLE PRECISION NULL");
                log.info("Coluna 'objectiveHours' (MySQL) corrigida com sucesso!");
            } catch (Exception ex) {
                try {
                    jdbcTemplate.execute("ALTER TABLE goals ALTER COLUMN objective_hours DROP NOT NULL");
                    log.info("Coluna 'objective_hours' (PostgreSQL) corrigida com sucesso!");
                } catch (Exception ex2) {
                    try {
                        jdbcTemplate.execute("ALTER TABLE goals ALTER COLUMN objectiveHours DROP NOT NULL");
                        log.info("Coluna 'objectiveHours' (PostgreSQL) corrigida com sucesso!");
                    } catch (Exception ex3) {
                        log.warn("Aviso: Não foi possível alterar a coluna objective_hours/objectiveHours. Mensagem: {}", ex3.getMessage());
                    }
                }
            }
        }

        // Corrigindo 'progress'
        try {
            jdbcTemplate.execute("ALTER TABLE goals MODIFY COLUMN progress DOUBLE PRECISION NULL");
            log.info("Coluna 'progress' (MySQL) corrigida com sucesso!");
        } catch (Exception e) {
            try {
                jdbcTemplate.execute("ALTER TABLE goals ALTER COLUMN progress DROP NOT NULL");
                log.info("Coluna 'progress' (PostgreSQL) corrigida com sucesso!");
            } catch (Exception ex) {
                log.warn("Aviso: Não foi possível alterar a coluna progress. Mensagem: {}", ex.getMessage());
            }
        }
    }
}
