CREATE TYPE date_state AS ENUM ('matched', 'playing', 'decided', 'messaged', 'accepted', 'declined', 'expired', 'flipped');

CREATE TABLE dates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_a        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_b        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    puzzle_id       UUID REFERENCES puzzles(id) ON DELETE SET NULL,
    state           date_state NOT NULL DEFAULT 'matched',
    winner_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    first_message   TEXT,
    room_expires_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (player_a <> player_b)
);

CREATE INDEX idx_dates_player_a ON dates(player_a);
CREATE INDEX idx_dates_player_b ON dates(player_b);
CREATE INDEX idx_dates_state ON dates(state);
