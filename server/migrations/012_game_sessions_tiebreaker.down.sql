ALTER TABLE game_sessions
    DROP COLUMN IF EXISTS wrong_count,
    DROP COLUMN IF EXISTS last_correct_at;
