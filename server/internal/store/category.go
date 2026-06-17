package store

import (
	"context"
)

func (s *PgStore) ListCategories(ctx context.Context) ([]Category, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name FROM categories ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Category
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
