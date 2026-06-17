package store

import (
	"context"
	"time"
)

func (s *PgStore) CreateDateMatch(ctx context.Context, m *DateMatch) (*DateMatch, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO dates (player_a, player_b, puzzle_id, state, winner_id, first_message, room_expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, player_a, player_b, puzzle_id, state, winner_id, first_message, room_expires_at, created_at, updated_at
	`, m.PlayerA, m.PlayerB, m.PuzzleID, m.State, m.WinnerID, m.FirstMessage, m.RoomExpiresAt)
	return scanDateMatch(row)
}

func (s *PgStore) GetDateMatch(ctx context.Context, id string) (*DateMatch, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, player_a, player_b, puzzle_id, state, winner_id, first_message, room_expires_at, created_at, updated_at
		FROM dates WHERE id = $1
	`, id)
	return scanDateMatch(row)
}

func (s *PgStore) GetDateMatchByPlayer(ctx context.Context, playerID string, states []string) (*DateMatch, error) {
	query := `
		SELECT id, player_a, player_b, puzzle_id, state, winner_id, first_message, room_expires_at, created_at, updated_at
		FROM dates
		WHERE (player_a = $1 OR player_b = $1)
	`
	args := []any{playerID}
	if len(states) > 0 {
		placeholders := make([]string, len(states))
		for i, state := range states {
			placeholders[i] = "$" + string(rune('0'+len(args)+1))
			args = append(args, state)
		}
		query += " AND state IN (" + placeholders[0]
		for i := 1; i < len(placeholders); i++ {
			query += ", " + placeholders[i]
		}
		query += ")"
	}
	query += " ORDER BY created_at DESC LIMIT 1"
	row := s.pool.QueryRow(ctx, query, args...)
	return scanDateMatch(row)
}

func (s *PgStore) UpdateDateMatch(ctx context.Context, m *DateMatch) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE dates
		SET puzzle_id = $2, state = $3, winner_id = $4, first_message = $5, room_expires_at = $6, updated_at = now()
		WHERE id = $1
	`, m.ID, m.PuzzleID, m.State, m.WinnerID, m.FirstMessage, m.RoomExpiresAt)
	return err
}

func (s *PgStore) ListDateMatchesByPlayer(ctx context.Context, playerID string, limit int) ([]DateMatch, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, player_a, player_b, puzzle_id, state, winner_id, first_message, room_expires_at, created_at, updated_at
		FROM dates
		WHERE player_a = $1 OR player_b = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, playerID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DateMatch
	for rows.Next() {
		m, err := scanDateMatch(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *m)
	}
	return out, rows.Err()
}

func (s *PgStore) CountDailyMatches(ctx context.Context, playerID string, since time.Time) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM dates
		WHERE (player_a = $1 OR player_b = $1) AND created_at >= $2
	`, playerID, since).Scan(&count)
	return count, err
}

func (s *PgStore) ExpireStaleMatches(ctx context.Context, matchedTimeout, playingTimeout time.Duration) (int, error) {
	now := time.Now().UTC()
	matchedCutoff := now.Add(-matchedTimeout)
	playingCutoff := now.Add(-playingTimeout)
	tag, err := s.pool.Exec(ctx, `
		UPDATE dates
		SET state = 'expired', updated_at = now()
		WHERE state IN ('matched', 'playing')
		  AND (
		    (state = 'matched' AND created_at < $1)
		    OR (state = 'playing' AND created_at < $2)
		  )
	`, matchedCutoff, playingCutoff)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func (s *PgStore) FlipDecidedMatches(ctx context.Context) (int, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE dates
		SET state = 'flipped', updated_at = now()
		WHERE state = 'decided'
		  AND room_expires_at IS NOT NULL
		  AND room_expires_at < now()
	`)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func (s *PgStore) ListFlippedMatches(ctx context.Context, limit int) ([]DateMatch, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, player_a, player_b, puzzle_id, state, winner_id, first_message, room_expires_at, created_at, updated_at
		FROM dates
		WHERE state = 'flipped' AND first_message IS NULL
		ORDER BY updated_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DateMatch
	for rows.Next() {
		m, err := scanDateMatch(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *m)
	}
	return out, rows.Err()
}

func scanDateMatch(row interface{ Scan(dest ...any) error }) (*DateMatch, error) {
	var m DateMatch
	if err := row.Scan(
		&m.ID,
		&m.PlayerA,
		&m.PlayerB,
		&m.PuzzleID,
		&m.State,
		&m.WinnerID,
		&m.FirstMessage,
		&m.RoomExpiresAt,
		&m.CreatedAt,
		&m.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &m, nil
}
