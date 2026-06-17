package store

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

func (s *PgStore) CreatePuzzle(ctx context.Context, p *Puzzle) (*Puzzle, error) {
	b, _ := json.Marshal(p.WordSet)
	row := s.pool.QueryRow(ctx, `
		INSERT INTO puzzles (owner_id, category_ids, difficulty, timer_seconds, word_set)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`, p.OwnerID, p.CategoryIDs, p.Difficulty, p.TimerSeconds, b)
	if err := row.Scan(&p.ID, &p.CreatedAt); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *PgStore) GetPuzzleByID(ctx context.Context, id string) (*Puzzle, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, owner_id, category_ids, difficulty, timer_seconds, word_set, created_at
		FROM puzzles WHERE id = $1
	`, id)
	return scanPuzzle(row)
}

func (s *PgStore) GetPuzzlesByOwner(ctx context.Context, ownerID string) ([]Puzzle, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, owner_id, category_ids, difficulty, timer_seconds, word_set, created_at
		FROM puzzles WHERE owner_id = $1 ORDER BY created_at DESC
	`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Puzzle
	for rows.Next() {
		p, err := scanPuzzle(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	return out, rows.Err()
}

func scanPuzzle(row pgx.Row) (*Puzzle, error) {
	var p Puzzle
	var raw []byte
	err := row.Scan(&p.ID, &p.OwnerID, &p.CategoryIDs, &p.Difficulty, &p.TimerSeconds, &raw, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	if raw != nil {
		_ = json.Unmarshal(raw, &p.WordSet)
	}
	return &p, nil
}
