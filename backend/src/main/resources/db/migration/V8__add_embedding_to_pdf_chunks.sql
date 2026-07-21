-- Migração V8: Adiciona coluna de embedding à tabela pdf_chunks para suporte a RAG
ALTER TABLE pdf_chunks ADD COLUMN IF NOT EXISTS embedding TEXT NULL;
