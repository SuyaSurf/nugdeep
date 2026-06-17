CREATE TYPE game_context AS ENUM ('daily', 'community', 'date');
CREATE TYPE game_result AS ENUM ('in_progress', 'won', 'lost', 'expired');

CREATE TABLE game_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puzzle_id    UUID NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context      game_context NOT NULL,
    context_id   UUID,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deadline     TIMESTAMPTZ NOT NULL,
    progress     INT NOT NULL DEFAULT 0,
    result       game_result NOT NULL DEFAULT 'in_progress',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_puzzle ON game_sessions(puzzle_id);
CREATE INDEX idx_game_sessions_result ON game_sessions(result);
