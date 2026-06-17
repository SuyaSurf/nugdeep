CREATE TYPE event_type AS ENUM ('puzzle_start', 'puzzle_win', 'puzzle_loss', 'date_queue', 'date_match', 'date_accept', 'date_decline', 'community_join', 'space_join', 'referral_redeem', 'purchase');

CREATE TABLE analytics_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    type       event_type NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
