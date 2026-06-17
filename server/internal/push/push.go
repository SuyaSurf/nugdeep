package push

import (
	"context"
	"fmt"
	"os"

	"games.bammby.com/server/internal/cache"
)

// Service is a skeleton for Firebase Cloud Messaging (or OneSignal) push notifications.
type Service struct {
	apiKey string
	cache  *cache.Cache
}

// NewService creates a push service from FCM_API_KEY env.
func NewService(c *cache.Cache) *Service {
	return &Service{apiKey: os.Getenv("FCM_API_KEY"), cache: c}
}

// IsConfigured returns true if the push API key is present.
func (s *Service) IsConfigured() bool {
	return s.apiKey != ""
}

// RegisterToken stores a device token for a user in Redis.
func (s *Service) RegisterToken(ctx context.Context, userID, token string) error {
	if s.cache == nil {
		return fmt.Errorf("cache unavailable")
	}
	return s.cache.SAdd(ctx, cache.PushTokenKey(userID), token)
}

// GetTokens returns a user's registered push tokens.
func (s *Service) GetTokens(ctx context.Context, userID string) ([]string, error) {
	if s.cache == nil {
		return nil, fmt.Errorf("cache unavailable")
	}
	return s.cache.SMembers(ctx, cache.PushTokenKey(userID))
}

// Send sends a push notification to a user.
func (s *Service) Send(ctx context.Context, userID, title, body string) error {
	if !s.IsConfigured() {
		return fmt.Errorf("push not configured")
	}
	_, _ = s.GetTokens(ctx, userID)
	// TODO: call FCM API with tokens
	return nil
}
