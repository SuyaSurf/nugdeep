CREATE TABLE communities (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    description   TEXT,
    hint          TEXT,
    icon_url      TEXT,
    puzzle_id     UUID NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
    max_members   INT,
    hidden        BOOLEAN NOT NULL DEFAULT true,
    boost_until   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_hidden ON communities(hidden) WHERE hidden = false;
CREATE INDEX idx_communities_boost ON communities(boost_until) WHERE boost_until IS NOT NULL;
