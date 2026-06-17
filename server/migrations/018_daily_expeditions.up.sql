CREATE TABLE daily_expedition_destinations (
    country_code TEXT PRIMARY KEY,
    country_name TEXT NOT NULL,
    region TEXT NOT NULL,
    flag_emoji TEXT NOT NULL,
    daily_fact TEXT NOT NULL,
    deep_dive_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
    quiz_culture JSONB NOT NULL DEFAULT '[]'::jsonb,
    quiz_language JSONB NOT NULL DEFAULT '[]'::jsonb,
    challenge_type TEXT NOT NULL,
    challenge_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    score_threshold INT NOT NULL DEFAULT 700,
    rotation_weight INT NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_expedition_atlas (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL REFERENCES daily_expedition_destinations(country_code) ON DELETE CASCADE,
    discovered_date DATE NOT NULL,
    expedition_score INT NOT NULL DEFAULT 0,
    quiz_culture_score INT NOT NULL DEFAULT 0,
    quiz_language_score INT NOT NULL DEFAULT 0,
    total_score INT NOT NULL DEFAULT 0,
    streak_shield_earned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, country_code)
);

CREATE TABLE user_expedition_streaks (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_played_date DATE,
    streak_shields INT NOT NULL DEFAULT 0,
    active_rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_expedition_scores (
    date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL REFERENCES daily_expedition_destinations(country_code) ON DELETE CASCADE,
    expedition_score INT NOT NULL DEFAULT 0,
    quiz_score INT NOT NULL DEFAULT 0,
    total_score INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (date, user_id)
);

CREATE INDEX idx_daily_expedition_destinations_active ON daily_expedition_destinations(active, country_code);
CREATE INDEX idx_user_expedition_atlas_user ON user_expedition_atlas(user_id, discovered_date DESC);
CREATE INDEX idx_daily_expedition_scores_date_score ON daily_expedition_scores(date, total_score DESC);
