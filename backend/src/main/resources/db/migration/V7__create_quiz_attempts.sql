-- Script de Migração V7 - Criação da tabela de quiz_attempts (PostgreSQL Syntax)
-- Study Management Platform (StudyFlow)

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id BIGSERIAL PRIMARY KEY,
    exam_prep_id BIGINT NOT NULL,
    attempt_time TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    score INT NOT NULL,
    correct_answers INT NOT NULL,
    total_questions INT NOT NULL,
    content_json TEXT NOT NULL,
    CONSTRAINT fk_quiz_attempts_exam_prep FOREIGN KEY (exam_prep_id) REFERENCES exam_preps(id) ON DELETE CASCADE
);
