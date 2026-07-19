-- Script de Migração V2 - Criação de Índices para Melhoria de Performance (PostgreSQL Syntax)
-- Study Management Platform (StudyFlow)

-- 1. Índices para Materias (subjects)
CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);

-- 2. Índices para Sessões de Estudo (study_sessions)
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON study_sessions(subject_id);

-- 3. Índices para Metas (goals)
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_subject ON goals(subject_id);

-- 4. Índices para Resumos (summaries)
CREATE INDEX IF NOT EXISTS idx_summaries_user ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_subject ON summaries(subject_id);
CREATE INDEX IF NOT EXISTS idx_summaries_user_subject ON summaries(user_id, subject_id);

-- 5. Índices para Flashcards (flashcards)
CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review_date);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_next_review ON flashcards(user_id, next_review_date);

-- 6. Índices para Arquivos PDF (uploaded_files)
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_subject ON uploaded_files(subject_id);

-- 7. Índices para Anotações (file_annotations)
CREATE INDEX IF NOT EXISTS idx_file_annotations_file ON file_annotations(file_id);
