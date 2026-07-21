-- Migração V10: Adiciona campos de compartilhamento social à tabela exam_preps
ALTER TABLE exam_preps ADD COLUMN IF NOT EXISTS share_token VARCHAR(36) UNIQUE NULL;
ALTER TABLE exam_preps ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
