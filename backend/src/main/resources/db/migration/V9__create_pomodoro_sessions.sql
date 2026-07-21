-- Migração V9: Criação da tabela de sessões de Pomodoro (Modo Foco)
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id BIGSERIAL PRIMARY KEY,
    exam_prep_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    duration_minutes INT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    content_consumed TEXT NULL,
    CONSTRAINT fk_pomodoro_sessions_exam_prep FOREIGN KEY (exam_prep_id) REFERENCES exam_preps(id) ON DELETE CASCADE,
    CONSTRAINT fk_pomodoro_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
