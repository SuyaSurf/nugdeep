package store

import (
	"context"
	"time"
)

func (s *PgStore) SetDailyPuzzle(ctx context.Context, date time.Time, puzzleID string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO daily_puzzles (date, puzzle_id) VALUES ($1, $2)
		ON CONFLICT (date) DO UPDATE SET puzzle_id = $2
	`, date, puzzleID)
	return err
}

func (s *PgStore) GetDailyPuzzle(ctx context.Context, date time.Time) (*Puzzle, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT p.id, p.owner_id, p.category_ids, p.difficulty, p.timer_seconds, p.word_set, p.created_at
		FROM puzzles p
		JOIN daily_puzzles dp ON dp.puzzle_id = p.id
		WHERE dp.date = $1
	`, date)
	return scanPuzzle(row)
}
