package store

import "context"

func (s *PgStore) CreateMessage(ctx context.Context, m *Message) (*Message, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO messages (scope, scope_id, user_id, body, moderation_status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`, m.Scope, m.ScopeID, m.UserID, m.Body, m.ModerationStatus)
	if err := row.Scan(&m.ID, &m.CreatedAt); err != nil {
		return nil, err
	}
	return m, nil
}

func (s *PgStore) ListMessagesByUser(ctx context.Context, userID string, limit int) ([]Message, error) {
	if limit <= 0 {
		limit = 1000
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, scope, scope_id, user_id, body, moderation_status, created_at
		FROM messages
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.Scope, &m.ScopeID, &m.UserID, &m.Body, &m.ModerationStatus, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *PgStore) ListMessages(ctx context.Context, scope, scopeID string, limit int) ([]Message, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, scope, scope_id, user_id, body, moderation_status, created_at
		FROM messages
		WHERE scope = $1 AND scope_id = $2 AND moderation_status != 'blocked'
		ORDER BY created_at DESC
		LIMIT $3
	`, scope, scopeID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.Scope, &m.ScopeID, &m.UserID, &m.Body, &m.ModerationStatus, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *PgStore) ListHeldMessages(ctx context.Context, limit int) ([]Message, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, scope, scope_id, user_id, body, moderation_status, created_at
		FROM messages
		WHERE moderation_status = 'held'
		ORDER BY created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.Scope, &m.ScopeID, &m.UserID, &m.Body, &m.ModerationStatus, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
