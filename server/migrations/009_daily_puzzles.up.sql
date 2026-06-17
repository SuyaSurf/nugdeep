CREATE TABLE daily_puzzles (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date      DATE NOT NULL UNIQUE,
    puzzle_id UUID NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_puzzles_date ON daily_puzzles(date);
