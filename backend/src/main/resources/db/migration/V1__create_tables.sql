-- Script de Migração Inicial - Criação de Tabelas (PostgreSQL Syntax)
-- Study Management Platform (StudyFlow)
-- Alinhado exatamente com as anotações @Column das entidades JPA

-- 1. Tabela de Usuários (users)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    nameUser VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    passwordUser VARCHAR(255) NOT NULL,
    creationDate TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    premium BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2. Tabela de Matérias (subjects)
CREATE TABLE IF NOT EXISTS subjects (
    id BIGSERIAL PRIMARY KEY,
    subjectName VARCHAR(200) NOT NULL,
    subjectDescription TEXT NULL,
    color VARCHAR(100) NULL,
    user_id BIGINT NOT NULL,
    CONSTRAINT FK_materia_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Tabela de Sessões de Estudo (study_sessions)
CREATE TABLE IF NOT EXISTS study_sessions (
    id BIGSERIAL PRIMARY KEY,
    duration INT NOT NULL, -- Duração em minutos
    sessionDate DATE NOT NULL, -- Apenas data (YYYY-MM-DD)
    observations TEXT NULL,
    subject_id BIGINT NOT NULL,
    CONSTRAINT FK_session_materia FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 4. Tabela de Metas de Estudo (goals)
CREATE TABLE IF NOT EXISTS goals (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    progress DOUBLE PRECISION NOT NULL DEFAULT 0.0, -- Horas acumuladas
    objectiveHours DOUBLE PRECISION NOT NULL, -- Horas meta
    startDateGoal DATE NOT NULL,
    endDateGoal DATE NOT NULL,
    user_id BIGINT NOT NULL,
    subject_id BIGINT NULL, -- Nullable (metas gerais)
    CONSTRAINT FK_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_goal_materia FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

-- 5. Tabela de Resumos (summaries)
CREATE TABLE IF NOT EXISTS summaries (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(250) NOT NULL,
    content TEXT NOT NULL, -- LONGTEXT -> TEXT no Postgres
    creation_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    last_modified_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    user_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    CONSTRAINT FK_summary_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_summary_materia FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 6. Tabela de Flashcards (flashcards)
CREATE TABLE IF NOT EXISTS flashcards (
    id BIGSERIAL PRIMARY KEY,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    next_review_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    box INT NOT NULL DEFAULT 1, -- Caixas Leitner (1 a 5)
    creation_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    user_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    summary_id BIGINT NULL,
    CONSTRAINT FK_flashcard_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_flashcard_materia FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CONSTRAINT FK_flashcard_summary FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE SET NULL
);

-- 7. Tabela de Arquivos PDF (uploaded_files)
CREATE TABLE IF NOT EXISTS uploaded_files (
    id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    upload_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    user_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    CONSTRAINT FK_file_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_file_materia FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 8. Tabela de Anotações em PDF (file_annotations)
CREATE TABLE IF NOT EXISTS file_annotations (
    id BIGSERIAL PRIMARY KEY,
    page_number INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- highlight ou note
    content TEXT NOT NULL, -- Conteúdo ou coordenadas em formato JSON
    last_modified TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    file_id BIGINT NOT NULL,
    CONSTRAINT FK_annotation_file FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
);
