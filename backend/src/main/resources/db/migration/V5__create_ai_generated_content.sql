-- Script de Migração V5 - Criação da tabela de ai_generated_content (PostgreSQL Syntax)
-- Study Management Platform (StudyFlow)

CREATE TABLE IF NOT EXISTS ai_generated_content (
    id BIGSERIAL PRIMARY KEY,
    content_type VARCHAR(100) NOT NULL, -- Enum ContentType
    difficulty_level VARCHAR(50) NOT NULL, -- Enum DifficultyLevel
    content_json TEXT NOT NULL,
    exam_prep_id BIGINT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_content_exam_prep FOREIGN KEY (exam_prep_id) REFERENCES exam_preps(id) ON DELETE CASCADE
);
