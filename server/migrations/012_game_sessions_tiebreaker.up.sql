ALTER TABLE game_sessions
    ADD COLUMN wrong_count INT NOT NULL DEFAULT 0,
    ADD COLUMN last_correct_at TIMESTAMPTZ;
