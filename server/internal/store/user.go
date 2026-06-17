package store

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *PgStore) GetUserByClerkID(ctx context.Context, clerkID string) (*User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, clerk_id, username, age_bucket, gender_identity, location_label, bio, categories,
		       puzzles_solved, wins, losses, streak, longest_streak, hide_communities,
		       shadow_banned_until, dating_eligible, email_verified, phone_verified, created_at, last_solve_at
		FROM users WHERE clerk_id = $1
	`, clerkID)
	return scanUser(row)
}

func (s *PgStore) GetUserByID(ctx context.Context, id string) (*User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, clerk_id, username, age_bucket, gender_identity, location_label, bio, categories,
		       puzzles_solved, wins, losses, streak, longest_streak, hide_communities,
		       shadow_banned_until, dating_eligible, email_verified, phone_verified, created_at, last_solve_at
		FROM users WHERE id = $1
	`, id)
	return scanUser(row)
}

func (s *PgStore) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, clerk_id, username, age_bucket, gender_identity, location_label, bio, categories,
		       puzzles_solved, wins, losses, streak, longest_streak, hide_communities,
		       shadow_banned_until, dating_eligible, email_verified, phone_verified, created_at, last_solve_at
		FROM users WHERE username = $1
	`, username)
	return scanUser(row)
}

func (s *PgStore) CreateUser(ctx context.Context, u *User) (*User, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO users (clerk_id, username, age_bucket, gender_identity, location_label, bio, categories, dating_eligible, email_verified, phone_verified)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at
	`, u.ClerkID, u.Username, u.AgeBucket, u.GenderIdentity, u.LocationLabel, u.Bio, u.Categories, u.DatingEligible, u.EmailVerified, u.PhoneVerified)
	if err := row.Scan(&u.ID, &u.CreatedAt); err != nil {
		return nil, err
	}
	return u, nil
}

func (s *PgStore) UpdateUser(ctx context.Context, u *User) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE users SET
			username = $2,
			age_bucket = $3,
			gender_identity = $4,
			location_label = $5,
			bio = $6,
			categories = $7,
			puzzles_solved = $8,
			wins = $9,
			losses = $10,
			streak = $11,
			longest_streak = $12,
			hide_communities = $13,
			shadow_banned_until = $14,
			dating_eligible = $15,
			email_verified = $16,
			phone_verified = $17,
			last_solve_at = $18
		WHERE id = $1
	`, u.ID, u.Username, u.AgeBucket, u.GenderIdentity, u.LocationLabel, u.Bio, u.Categories,
		u.PuzzlesSolved, u.Wins, u.Losses, u.Streak, u.LongestStreak, u.HideCommunities,
		u.ShadowBannedUntil, u.DatingEligible, u.EmailVerified, u.PhoneVerified, u.LastSolveAt)
	return err
}

// DeleteUser hard-deletes a user and all related data.
func (s *PgStore) DeleteUser(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `
		DELETE FROM users WHERE id = $1
	`, id)
	return err
}

// PurgeInactiveUsers hard-deletes users inactive for more than 12 months.
func (s *PgStore) PurgeInactiveUsers(ctx context.Context, before time.Time) (int, error) {
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM users
		WHERE last_solve_at < $1 OR (last_solve_at IS NULL AND created_at < $1)
	`, before)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

// ResetStreaksForInactiveUsers sets streak=0 for users whose last_solve_at is before cutoff.
func (s *PgStore) ResetStreaksForInactiveUsers(ctx context.Context, cutoff time.Time) (int, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE users
		SET streak = 0
		WHERE last_solve_at < $1 OR last_solve_at IS NULL
	`, cutoff)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func scanUser(row pgx.Row) (*User, error) {
	var u User
	var raw []byte
	var sbu *time.Time
	var lsu *time.Time
	err := row.Scan(
		&u.ID, &u.ClerkID, &u.Username, &u.AgeBucket, &u.GenderIdentity, &u.LocationLabel,
		&u.Bio, &raw, &u.PuzzlesSolved, &u.Wins, &u.Losses, &u.Streak, &u.LongestStreak,
		&u.HideCommunities, &sbu, &u.DatingEligible, &u.EmailVerified, &u.PhoneVerified, &u.CreatedAt, &lsu,
	)
	if err != nil {
		return nil, err
	}
	if raw != nil {
		_ = json.Unmarshal(raw, &u.Categories)
	}
	u.ShadowBannedUntil = sbu
	u.LastSolveAt = lsu
	return &u, nil
}
