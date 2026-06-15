package lobby

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"games.bammby.com/server/internal/cache"
	"github.com/redis/go-redis/v9"
)

const (
	queuePrefix    = "lobby_queue"
	matchPrefix    = "lobby_match"
	locationsKey   = "lobby_locations"
	queueTTL       = 60 * time.Second
	locationExpiry = 30 * time.Second
)

func queueKey(intent Intent, game GameID, activityCode ActivityCode, choice string) string {
	return fmt.Sprintf("%s:%s:%s:%s:%s", queuePrefix, intent, game, activityCode, choice)
}

func (e *QueueEntry) CompositeKey() string {
	return queueKey(e.Intent, e.Game, e.ActivityCode, e.Choice)
}

type Service struct {
	rdb *redis.Client
}

func NewService(c *cache.Cache) *Service {
	return &Service{rdb: c.Redis()}
}

func (s *Service) JoinQueue(ctx context.Context, entry *QueueEntry) (*QueueResponse, error) {
	key := entry.CompositeKey()

	results, err := s.rdb.ZRangeByScore(ctx, key, &redis.ZRangeBy{
		Min:    "0",
		Max:    fmt.Sprintf("%d", time.Now().Unix()),
		Offset: 0,
		Count:  1,
	}).Result()
	if err != nil {
		return nil, fmt.Errorf("queue lookup failed: %w", err)
	}

	if len(results) > 0 {
		var existing QueueEntry
		if err := json.Unmarshal([]byte(results[0]), &existing); err != nil {
			return nil, fmt.Errorf("parse queue entry failed: %w", err)
		}

		if time.Since(existing.QueuedAt) > queueTTL {
			s.rdb.ZRem(ctx, key, results[0])
		} else {
			s.rdb.ZRem(ctx, key, results[0])

			match := &Match{
				ID:           uuid.New().String(),
				PlayerA:      existing.UserID,
				PlayerB:      entry.UserID,
				Intent:       entry.Intent,
				Game:         entry.Game,
				ActivityCode: entry.ActivityCode,
				Choice:       entry.Choice,
				State:        "matched",
				CreatedAt:    time.Now(),
			}

			matchData, _ := json.Marshal(match)
			s.rdb.Set(ctx, fmt.Sprintf("%s:%s", matchPrefix, match.ID), matchData, 24*time.Hour)

			return &QueueResponse{Status: "matched", MatchID: match.ID}, nil
		}
	}

	entry.QueuedAt = time.Now()
	data, _ := json.Marshal(entry)
	s.rdb.ZAdd(ctx, key, redis.Z{
		Score:  float64(entry.QueuedAt.Unix()),
		Member: string(data),
	})

	return &QueueResponse{Status: "queued", QueuedAt: entry.QueuedAt.Unix()}, nil
}

func (s *Service) LeaveQueue(ctx context.Context, userID string) error {
	iter := s.rdb.Scan(ctx, 0, fmt.Sprintf("%s:*", queuePrefix), 100).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		results, _ := s.rdb.ZRange(ctx, key, 0, -1).Result()
		for _, member := range results {
			var entry QueueEntry
			if json.Unmarshal([]byte(member), &entry) == nil && entry.UserID == userID {
				s.rdb.ZRem(ctx, key, member)
			}
		}
	}
	return iter.Err()
}

func (s *Service) GetMatch(ctx context.Context, matchID string) (*Match, error) {
	data, err := s.rdb.Get(ctx, fmt.Sprintf("%s:%s", matchPrefix, matchID)).Bytes()
	if err != nil {
		return nil, err
	}
	var m Match
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *Service) UpdateMatch(ctx context.Context, match *Match) error {
	data, _ := json.Marshal(match)
	return s.rdb.Set(ctx, fmt.Sprintf("%s:%s", matchPrefix, match.ID), data, 24*time.Hour).Err()
}

func (s *Service) SelectLocations(ctx context.Context, matchID, userID string, locationIDs []string) error {
	if len(locationIDs) != 2 {
		return fmt.Errorf("must pick exactly 2 locations")
	}
	match, err := s.GetMatch(ctx, matchID)
	if err != nil {
		return err
	}
	if match.LoserID == nil || *match.LoserID != userID {
		return fmt.Errorf("only the loser can pick locations")
	}
	if match.State != "game_over" {
		return fmt.Errorf("match is not in game_over state")
	}

	key := fmt.Sprintf("%s:%s:loser_picks", locationsKey, matchID)
	for _, id := range locationIDs {
		s.rdb.SAdd(ctx, key, id)
	}

	match.State = "picking_locations"
	return s.UpdateMatch(ctx, match)
}

func (s *Service) ChooseLocation(ctx context.Context, matchID, userID, locationID string) (matched bool, err error) {
	match, err := s.GetMatch(ctx, matchID)
	if err != nil {
		return false, err
	}
	if match.WinnerID == nil || *match.WinnerID != userID {
		return false, fmt.Errorf("only the winner can choose")
	}
	if match.State != "picking_locations" {
		return false, fmt.Errorf("locations not yet picked")
	}

	key := fmt.Sprintf("%s:%s:loser_picks", locationsKey, matchID)
	isMatch, _ := s.rdb.SIsMember(ctx, key, locationID).Result()

	if isMatch {
		match.State = "chatting"
	} else {
		match.State = "completed"
	}
	s.UpdateMatch(ctx, match)

	return isMatch, nil
}

func (s *Service) CleanupStaleEntries(ctx context.Context) {
	cutoff := fmt.Sprintf("%d", time.Now().Add(-queueTTL).Unix())
	iter := s.rdb.Scan(ctx, 0, fmt.Sprintf("%s:*", queuePrefix), 100).Iterator()
	for iter.Next(ctx) {
		s.rdb.ZRemRangeByScore(ctx, iter.Val(), "0", cutoff)
	}
}

func (s *Service) EnsureStaleMatchSuffix() {
	// Reserved for future stale-match expiry.
	_ = strings.TrimSpace
}
