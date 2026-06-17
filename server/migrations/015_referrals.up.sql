CREATE TABLE referrals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_granted BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (referrer_id, referred_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
