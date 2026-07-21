-- Script de Migração V6 - Criação da tabela de exam_simulations (PostgreSQL Syntax)
-- Study Management Platform (StudyFlow)

CREATE TABLE IF NOT EXISTS exam_simulations (
    id BIGSERIAL PRIMARY KEY,
    exam_prep_id BIGINT NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NULL,
    score INT NULL,
    status VARCHAR(50) NOT NULL, -- Enum: STARTED, COMPLETED, TIMED_OUT, CANCELLED
    content_json TEXT NOT NULL,
    CONSTRAINT fk_exam_simulations_exam_prep FOREIGN KEY (exam_prep_id) REFERENCES exam_preps(id) ON DELETE CASCADE
);
