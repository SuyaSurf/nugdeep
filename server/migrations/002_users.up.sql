CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id            TEXT NOT NULL UNIQUE,
    username            TEXT NOT NULL UNIQUE,
    age_bucket          TEXT,
    gender_identity     TEXT,
    location_label      TEXT,
    bio                 TEXT,
    categories          TEXT[] DEFAULT '{}',
    puzzles_solved      INT  NOT NULL DEFAULT 0,
    wins                INT  NOT NULL DEFAULT 0,
    losses              INT  NOT NULL DEFAULT 0,
    streak              INT  NOT NULL DEFAULT 0,
    longest_streak      INT  NOT NULL DEFAULT 0,
    hide_communities    BOOLEAN NOT NULL DEFAULT false,
    shadow_banned_until TIMESTAMPTZ,
    dating_eligible     BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
