CREATE TYPE report_reason AS ENUM ('harassment', 'spam', 'nsfw', 'other');
CREATE TYPE report_status AS ENUM ('open', 'resolved', 'dismissed');

CREATE TABLE blocks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (blocker_id, target_id)
);

CREATE TABLE reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id  UUID REFERENCES messages(id) ON DELETE SET NULL,
    reason      report_reason NOT NULL,
    status      report_status NOT NULL DEFAULT 'open',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_reports_target ON reports(target_id);
CREATE INDEX idx_reports_status ON reports(status);
