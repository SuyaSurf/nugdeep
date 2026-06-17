package store

import (
	"context"
	"time"
)

func (s *PgStore) CreateGameSession(ctx context.Context, sess *GameSession) (*GameSession, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO game_sessions (puzzle_id, user_id, context, context_id, started_at, deadline, progress, wrong_count, last_correct_at, result)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at
	`, sess.PuzzleID, sess.UserID, sess.Context, sess.ContextID, sess.StartedAt, sess.Deadline, sess.Progress, sess.WrongCount, sess.LastCorrectAt, sess.Result)
	if err := row.Scan(&sess.ID, &sess.CreatedAt); err != nil {
		return nil, err
	}
	return sess, nil
}

func (s *PgStore) GetGameSession(ctx context.Context, id string) (*GameSession, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, puzzle_id, user_id, context, context_id, started_at, deadline, progress, wrong_count, last_correct_at, result, created_at
		FROM game_sessions WHERE id = $1
	`, id)
	var sess GameSession
	var cid *string
	var lcat *time.Time
	err := row.Scan(&sess.ID, &sess.PuzzleID, &sess.UserID, &sess.Context, &cid, &sess.StartedAt, &sess.Deadline, &sess.Progress, &sess.WrongCount, &lcat, &sess.Result, &sess.CreatedAt)
	if err != nil {
		return nil, err
	}
	sess.ContextID = cid
	sess.LastCorrectAt = lcat
	return &sess, nil
}

func (s *PgStore) UpdateGameSessionResult(ctx context.Context, id, result string, progress int) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE game_sessions SET result = $2, progress = $3 WHERE id = $1
	`, id, result, progress)
	return err
}

func (s *PgStore) UpdateGameSessionStats(ctx context.Context, id, result string, progress, wrongCount int, lastCorrectAt *time.Time) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE game_sessions SET result = $2, progress = $3, wrong_count = $4, last_correct_at = $5 WHERE id = $1
	`, id, result, progress, wrongCount, lastCorrectAt)
	return err
}
