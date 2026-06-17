CREATE TYPE space_state AS ENUM ('open', 'closed');

CREATE TABLE spaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id    UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    topic           TEXT,
    state           space_state NOT NULL DEFAULT 'open',
    speaking_enabled BOOLEAN NOT NULL DEFAULT true,
    livekit_room    TEXT,
    opens_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    closes_at       TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE speaker_rounds (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id   UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    round_no   INT NOT NULL,
    opened_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at  TIMESTAMPTZ
);

CREATE TABLE speak_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id    UUID NOT NULL REFERENCES speaker_rounds(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved    BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_spaces_community ON spaces(community_id);
CREATE INDEX idx_spaces_state ON spaces(state);
CREATE INDEX idx_speaker_rounds_space ON speaker_rounds(space_id);
CREATE INDEX idx_speak_requests_round ON speak_requests(round_id);
