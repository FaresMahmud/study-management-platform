-- Script de Migração V3 - Criação da tabela de ExamPrep (PostgreSQL Syntax)
-- Study Management Platform (StudyFlow)

CREATE TABLE IF NOT EXISTS exam_preps (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    exam_date DATE NOT NULL,
    target_score INT NOT NULL, -- Meta de nota de 0 a 100
    status VARCHAR(50) NOT NULL, -- Enum: ACTIVE, COMPLETED, ARCHIVED
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_exam_preps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Associa Subjects e Goals ao ExamPrep
ALTER TABLE subjects ADD COLUMN exam_prep_id BIGINT NULL;
ALTER TABLE subjects ADD CONSTRAINT fk_subjects_exam_prep FOREIGN KEY (exam_prep_id) REFERENCES exam_preps(id) ON DELETE SET NULL;

ALTER TABLE goals ADD COLUMN exam_prep_id BIGINT NULL;
ALTER TABLE goals ADD CONSTRAINT fk_goals_exam_prep FOREIGN KEY (exam_prep_id) REFERENCES exam_preps(id) ON DELETE CASCADE;

-- Modifica as metas para suportar domínio (%)
ALTER TABLE goals ADD COLUMN target_mastery INT NULL;
ALTER TABLE goals ADD COLUMN current_mastery INT NULL;
