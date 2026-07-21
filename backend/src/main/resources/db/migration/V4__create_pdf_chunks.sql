-- Script de Migração V4 - Criação da tabela de pdf_chunks (PostgreSQL Syntax)
-- Study Management Platform (StudyFlow)

CREATE TABLE IF NOT EXISTS pdf_chunks (
    id BIGSERIAL PRIMARY KEY,
    chunk_text TEXT NOT NULL,
    chunk_index INT NOT NULL,
    file_id BIGINT NOT NULL,
    exam_prep_id BIGINT NOT NULL,
    CONSTRAINT fk_pdf_chunks_file FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE,
    CONSTRAINT fk_pdf_chunks_exam_prep FOREIGN KEY (exam_prep_id) REFERENCES exam_preps(id) ON DELETE CASCADE
);
