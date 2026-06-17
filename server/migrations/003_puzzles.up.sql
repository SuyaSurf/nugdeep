CREATE TABLE puzzles (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_ids   TEXT[] NOT NULL,
    difficulty     INT NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
    timer_seconds  INT NOT NULL DEFAULT 50,
    word_set       JSONB NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_puzzles_owner ON puzzles(owner_id);
CREATE INDEX idx_puzzles_categories ON puzzles USING GIN(category_ids);
