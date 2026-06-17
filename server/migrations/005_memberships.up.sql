CREATE TYPE membership_role AS ENUM ('owner', 'moderator', 'member');
CREATE TYPE membership_via AS ENUM ('puzzle', 'code', 'manual');

CREATE TABLE memberships (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         membership_role NOT NULL DEFAULT 'member',
    via          membership_via NOT NULL DEFAULT 'puzzle',
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (community_id, user_id)
);

CREATE INDEX idx_memberships_community ON memberships(community_id);
CREATE INDEX idx_memberships_user ON memberships(user_id);
