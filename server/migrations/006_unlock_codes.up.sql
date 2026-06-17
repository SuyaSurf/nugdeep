CREATE TABLE unlock_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    minted_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    used_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_unlock_codes_code ON unlock_codes(code);
CREATE INDEX idx_unlock_codes_community ON unlock_codes(community_id);
