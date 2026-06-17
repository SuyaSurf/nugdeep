package store

import (
	"context"
	"time"
)

func (s *PgStore) CreateBlock(ctx context.Context, blockerID, targetID string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO blocks (blocker_id, target_id) VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, blockerID, targetID)
	return err
}

func (s *PgStore) IsBlocked(ctx context.Context, blockerID, targetID string) (bool, error) {
	var n int
	row := s.pool.QueryRow(ctx, `
		SELECT 1 FROM blocks WHERE blocker_id = $1 AND target_id = $2
	`, blockerID, targetID)
	err := row.Scan(&n)
	if err != nil {
		return false, nil // no rows = not blocked
	}
	return true, nil
}

func (s *PgStore) CreateReport(ctx context.Context, reporterID, targetID, messageID, reason string) error {
	var mid interface{} = nil
	if messageID != "" {
		mid = messageID
	}
	_, err := s.pool.Exec(ctx, `
		INSERT INTO reports (reporter_id, target_id, message_id, reason)
		VALUES ($1, $2, $3, $4)
	`, reporterID, targetID, mid, reason)
	return err
}

func (s *PgStore) CountRecentReports(ctx context.Context, targetID string, since time.Time) (int, error) {
	var n int
	row := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM reports WHERE target_id = $1 AND created_at > $2
	`, targetID, since)
	err := row.Scan(&n)
	return n, err
}

// AutoShadowBan sets shadow_banned_until = now+24h for any user who has
// >= threshold reports in the last window and is not already banned.
func (s *PgStore) AutoShadowBan(ctx context.Context, threshold int, window time.Duration) (int, error) {
	since := time.Now().UTC().Add(-window)
	tag, err := s.pool.Exec(ctx, `
		UPDATE users
		SET shadow_banned_until = now() + interval '24 hours'
		WHERE id IN (
			SELECT target_id FROM reports
			WHERE created_at > $1
			GROUP BY target_id
			HAVING COUNT(*) >= $2
		)
		AND (shadow_banned_until IS NULL OR shadow_banned_until < now())
	`, since, threshold)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}
