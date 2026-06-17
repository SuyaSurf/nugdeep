package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PgStore implements Repository using PostgreSQL / pgx.
type PgStore struct {
	pool *pgxpool.Pool
}

// NewPgStore creates a Repository backed by Postgres.
func NewPgStore(pool *pgxpool.Pool) *PgStore {
	return &PgStore{pool: pool}
}

func (s *PgStore) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}
