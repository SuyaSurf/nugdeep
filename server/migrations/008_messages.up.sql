CREATE TYPE message_scope AS ENUM ('community', 'space', 'date');
CREATE TYPE moderation_status AS ENUM ('ok', 'held', 'blocked');

CREATE TABLE messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope             message_scope NOT NULL,
    scope_id          UUID NOT NULL,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body              TEXT NOT NULL,
    moderation_status moderation_status NOT NULL DEFAULT 'ok',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_scope ON messages(scope, scope_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id);
