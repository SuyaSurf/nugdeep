package matchmaking

import (
	"context"
	"fmt"
	"strings"
	"time"

	"games.bammby.com/server/internal/cache"
	"games.bammby.com/server/internal/store"
	"games.bammby.com/server/internal/ws"
)

// QueueResult describes a queue join attempt.
type QueueResult struct {
	Status string           `json:"status"`
	Match  *store.DateMatch `json:"match,omitempty"`
}

// Service pairs users with overlapping categories using Redis sorted sets.
type Service struct {
	cache *cache.Cache
	store store.Repository
	hub   *ws.Hub
}

func NewService(c *cache.Cache, s store.Repository, hub *ws.Hub) *Service {
	return &Service{cache: c, store: s, hub: hub}
}

func (s *Service) Join(ctx context.Context, user *store.User, categories []string) (*QueueResult, error) {
	if s.cache == nil {
		return nil, fmt.Errorf("matchmaking unavailable")
	}
	if len(categories) == 0 {
		categories = user.Categories
	}
	categories = normalizeCategories(categories)
	if len(categories) == 0 {
		return nil, fmt.Errorf("at least one category required")
	}
	if len(categories) > 3 {
		categories = categories[:3]
	}

	for _, category := range categories {
		key := queueKey(category)
		entries, err := s.cache.LeaderboardTop(ctx, key, 25)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			otherID, ok := entry.Member.(string)
			if !ok || otherID == "" || otherID == user.ID {
				continue
			}
			if blocked, _ := s.store.IsBlocked(ctx, user.ID, otherID); blocked {
				continue
			}
			if blocked, _ := s.store.IsBlocked(ctx, otherID, user.ID); blocked {
				continue
			}
			_ = s.cache.LeaderboardRemove(ctx, key, otherID)
			_ = s.removeFromQueues(ctx, otherID, categories)
			match, err := s.store.CreateDateMatch(ctx, &store.DateMatch{
				PlayerA: user.ID,
				PlayerB: otherID,
				State:   "matched",
			})
			if err != nil {
				return nil, err
			}
			if s.hub != nil {
				payload := map[string]any{
					"type":  "date:matched",
					"match": match,
					"room":  "date:" + match.ID,
				}
				_ = s.hub.BroadcastToRoom("user:"+user.ID, payload)
				_ = s.hub.BroadcastToRoom("user:"+otherID, payload)
			}
			_ = s.store.CreateAnalyticsEvent(ctx, user.ID, "date_match", map[string]any{
				"match_id":    match.ID,
				"opponent_id": otherID,
			})
			return &QueueResult{Status: "matched", Match: match}, nil
		}
	}

	score := float64(time.Now().UTC().Unix())
	for _, category := range categories {
		if err := s.cache.LeaderboardAdd(ctx, queueKey(category), score, user.ID); err != nil {
			return nil, err
		}
	}
	return &QueueResult{Status: "queued"}, nil
}

func (s *Service) Leave(ctx context.Context, userID string, categories []string) error {
	categories = normalizeCategories(categories)
	return s.removeFromQueues(ctx, userID, categories)
}

func (s *Service) removeFromQueues(ctx context.Context, userID string, categories []string) error {
	if s.cache == nil {
		return nil
	}
	if len(categories) == 0 {
		categories = []string{"movies", "science", "sports", "food", "pop_culture", "tech", "history", "travel", "music"}
	}
	for _, category := range categories {
		if err := s.cache.LeaderboardRemove(ctx, queueKey(category), userID); err != nil {
			return err
		}
	}
	return nil
}

func queueKey(category string) string {
	return "dating_queue:" + category
}

func normalizeCategories(categories []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(categories))
	for _, category := range categories {
		category = strings.TrimSpace(strings.ToLower(category))
		if category == "" || seen[category] {
			continue
		}
		seen[category] = true
		out = append(out, category)
	}
	return out
}

// StartExpiryWorker runs a background goroutine that auto-expires stale matches.
func (s *Service) StartExpiryWorker(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			expired, err := s.store.ExpireStaleMatches(ctx, 5*time.Minute, 10*time.Minute)
			cancel()
			if err == nil && expired > 0 && s.hub != nil {
				_ = s.hub.BroadcastToRoom("global", map[string]any{
					"type":    "system:match_expiry",
					"expired": expired,
				})
			}
		}
	}()
}
