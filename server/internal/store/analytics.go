package store

import (
	"context"
	"encoding/json"
)

func (s *PgStore) CreateAnalyticsEvent(ctx context.Context, userID string, eventType string, properties map[string]any) error {
	props, _ := json.Marshal(properties)
	_, err := s.pool.Exec(ctx, `
		INSERT INTO analytics_events (user_id, type, properties)
		VALUES ($1, $2, $3)
	`, userID, eventType, props)
	return err
}
