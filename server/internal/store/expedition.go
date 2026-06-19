package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *PgStore) SeedExpeditionDestinations(ctx context.Context, destinations []ExpeditionDestination) error {
	for _, d := range destinations {
		_, err := s.pool.Exec(ctx, `
			INSERT INTO daily_expedition_destinations (
				country_code, country_name, region, flag_emoji, daily_fact,
				deep_dive_facts, quiz_culture, quiz_language, challenge_type,
				challenge_params, score_threshold, active
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
			ON CONFLICT (country_code) DO UPDATE SET
				country_name = EXCLUDED.country_name,
				region = EXCLUDED.region,
				flag_emoji = EXCLUDED.flag_emoji,
				daily_fact = EXCLUDED.daily_fact,
				deep_dive_facts = EXCLUDED.deep_dive_facts,
				quiz_culture = EXCLUDED.quiz_culture,
				quiz_language = EXCLUDED.quiz_language,
				challenge_type = EXCLUDED.challenge_type,
				challenge_params = EXCLUDED.challenge_params,
				score_threshold = EXCLUDED.score_threshold,
				active = EXCLUDED.active
		`, d.CountryCode, d.CountryName, d.Region, d.FlagEmoji, d.DailyFact, d.DeepDiveFacts, d.QuizCulture, d.QuizLanguage, d.ChallengeType, d.ChallengeParams, d.ScoreThreshold, d.Active)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *PgStore) ListExpeditionDestinations(ctx context.Context) ([]ExpeditionDestination, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT country_code, country_name, region, flag_emoji, daily_fact, deep_dive_facts,
		       quiz_culture, quiz_language, challenge_type, challenge_params, score_threshold, active, created_at
		FROM daily_expedition_destinations
		WHERE active = true
		ORDER BY country_code
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ExpeditionDestination{}
	for rows.Next() {
		d, err := scanExpeditionDestination(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *d)
	}
	return out, rows.Err()
}

func (s *PgStore) GetExpeditionDestination(ctx context.Context, countryCode string) (*ExpeditionDestination, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT country_code, country_name, region, flag_emoji, daily_fact, deep_dive_facts,
		       quiz_culture, quiz_language, challenge_type, challenge_params, score_threshold, active, created_at
		FROM daily_expedition_destinations
		WHERE country_code = $1 AND active = true
	`, countryCode)
	return scanExpeditionDestination(row)
}

func scanExpeditionDestination(row pgx.Row) (*ExpeditionDestination, error) {
	var d ExpeditionDestination
	err := row.Scan(&d.CountryCode, &d.CountryName, &d.Region, &d.FlagEmoji, &d.DailyFact, &d.DeepDiveFacts, &d.QuizCulture, &d.QuizLanguage, &d.ChallengeType, &d.ChallengeParams, &d.ScoreThreshold, &d.Active, &d.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *PgStore) GetExpeditionAtlasEntry(ctx context.Context, userID, countryCode string) (*ExpeditionAtlasEntry, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT user_id, country_code, discovered_date, expedition_score, quiz_culture_score,
		       quiz_language_score, total_score, streak_shield_earned
		FROM user_expedition_atlas
		WHERE user_id = $1 AND country_code = $2
	`, userID, countryCode)
	entry, err := scanExpeditionAtlasEntry(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return entry, err
}

func (s *PgStore) UpsertExpeditionAtlasEntry(ctx context.Context, entry ExpeditionAtlasEntry) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO user_expedition_atlas (
			user_id, country_code, discovered_date, expedition_score, quiz_culture_score,
			quiz_language_score, total_score, streak_shield_earned
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (user_id, country_code) DO UPDATE SET
			expedition_score = GREATEST(user_expedition_atlas.expedition_score, EXCLUDED.expedition_score),
			quiz_culture_score = GREATEST(user_expedition_atlas.quiz_culture_score, EXCLUDED.quiz_culture_score),
			quiz_language_score = GREATEST(user_expedition_atlas.quiz_language_score, EXCLUDED.quiz_language_score),
			total_score = GREATEST(user_expedition_atlas.total_score, EXCLUDED.total_score),
			streak_shield_earned = user_expedition_atlas.streak_shield_earned OR EXCLUDED.streak_shield_earned,
			updated_at = now()
	`, entry.UserID, entry.CountryCode, entry.DiscoveredDate, entry.ExpeditionScore, entry.QuizCultureScore, entry.QuizLanguageScore, entry.TotalScore, entry.StreakShieldEarned)
	return err
}

func scanExpeditionAtlasEntry(row pgx.Row) (*ExpeditionAtlasEntry, error) {
	var entry ExpeditionAtlasEntry
	err := row.Scan(&entry.UserID, &entry.CountryCode, &entry.DiscoveredDate, &entry.ExpeditionScore, &entry.QuizCultureScore, &entry.QuizLanguageScore, &entry.TotalScore, &entry.StreakShieldEarned)
	if err != nil {
		return nil, err
	}
	return &entry, nil
}

func (s *PgStore) ListExpeditionAtlas(ctx context.Context, userID string) ([]ExpeditionAtlasEntry, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT user_id, country_code, discovered_date, expedition_score, quiz_culture_score,
		       quiz_language_score, total_score, streak_shield_earned
		FROM user_expedition_atlas
		WHERE user_id = $1
		ORDER BY discovered_date DESC, country_code ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ExpeditionAtlasEntry{}
	for rows.Next() {
		entry, err := scanExpeditionAtlasEntry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *entry)
	}
	return out, rows.Err()
}

func (s *PgStore) GetExpeditionStreak(ctx context.Context, userID string) (*ExpeditionStreak, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT user_id, current_streak, longest_streak, last_played_date, streak_shields, active_rewards
		FROM user_expedition_streaks
		WHERE user_id = $1
	`, userID)
	var streak ExpeditionStreak
	err := row.Scan(&streak.UserID, &streak.CurrentStreak, &streak.LongestStreak, &streak.LastPlayedDate, &streak.StreakShields, &streak.ActiveRewards)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &streak, nil
}

func (s *PgStore) UpsertExpeditionStreak(ctx context.Context, streak ExpeditionStreak) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO user_expedition_streaks (user_id, current_streak, longest_streak, last_played_date, streak_shields, active_rewards)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (user_id) DO UPDATE SET
			current_streak = EXCLUDED.current_streak,
			longest_streak = GREATEST(user_expedition_streaks.longest_streak, EXCLUDED.longest_streak),
			last_played_date = EXCLUDED.last_played_date,
			streak_shields = LEAST(EXCLUDED.streak_shields, 3),
			active_rewards = EXCLUDED.active_rewards,
			updated_at = now()
	`, streak.UserID, streak.CurrentStreak, streak.LongestStreak, streak.LastPlayedDate, streak.StreakShields, streak.ActiveRewards)
	return err
}

func (s *PgStore) UpsertExpeditionDailyScore(ctx context.Context, date time.Time, userID, countryCode string, expeditionScore, quizScore, totalScore int) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO daily_expedition_scores (date, user_id, country_code, expedition_score, quiz_score, total_score)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (date, user_id) DO UPDATE SET
			expedition_score = GREATEST(daily_expedition_scores.expedition_score, EXCLUDED.expedition_score),
			quiz_score = GREATEST(daily_expedition_scores.quiz_score, EXCLUDED.quiz_score),
			total_score = GREATEST(daily_expedition_scores.total_score, EXCLUDED.total_score),
			completed_at = now()
	`, date, userID, countryCode, expeditionScore, quizScore, totalScore)
	return err
}

func (s *PgStore) ListExpeditionDailyScores(ctx context.Context, date time.Time, limit int) ([]ExpeditionLeaderboardEntry, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT user_id, country_code, total_score
		FROM daily_expedition_scores
		WHERE date = $1
		ORDER BY total_score DESC
		LIMIT $2
	`, date, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ExpeditionLeaderboardEntry{}
	for rows.Next() {
		var entry ExpeditionLeaderboardEntry
		err := rows.Scan(&entry.UserID, &entry.CountryCode, &entry.TotalScore)
		if err != nil {
			return nil, err
		}
		out = append(out, entry)
	}
	return out, rows.Err()
}
