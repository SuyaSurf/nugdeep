package audio

import (
	"context"
	"fmt"
	"time"

	"games.bammby.com/server/internal/cache"
)

// Room represents an audio space room.
type Room struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	HostID      string    `json:"host_id"`
	Topic       string    `json:"topic"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	Participant int       `json:"participant_count"`
}

// Service manages audio space rooms using Redis.
type Service struct {
	cache *cache.Cache
}

// NewService creates an audio space service.
func NewService(c *cache.Cache) *Service {
	return &Service{cache: c}
}

// CreateRoom creates a new audio room with 24h TTL.
func (s *Service) CreateRoom(ctx context.Context, room *Room) error {
	if s.cache == nil {
		return fmt.Errorf("cache unavailable")
	}
	room.CreatedAt = time.Now().UTC()
	room.ExpiresAt = room.CreatedAt.Add(24 * time.Hour)
	return s.cache.SetJSON(ctx, roomKey(room.ID), room, 24*time.Hour)
}

// GetRoom retrieves a room by ID.
func (s *Service) GetRoom(ctx context.Context, id string) (*Room, error) {
	if s.cache == nil {
		return nil, fmt.Errorf("cache unavailable")
	}
	var room Room
	if err := s.cache.GetJSON(ctx, roomKey(id), &room); err != nil {
		return nil, err
	}
	return &room, nil
}

// DeleteRoom removes a room.
func (s *Service) DeleteRoom(ctx context.Context, id string) error {
	if s.cache == nil {
		return fmt.Errorf("cache unavailable")
	}
	return s.cache.Delete(ctx, roomKey(id))
}

// ListRooms returns all active rooms.
func (s *Service) ListRooms(ctx context.Context) ([]Room, error) {
	if s.cache == nil {
		return nil, fmt.Errorf("cache unavailable")
	}
	// Scan for room keys (simplified: scan with pattern)
	keys, _, err := s.cache.Scan(ctx, "audio_room:*", 100)
	if err != nil {
		return nil, err
	}
	var rooms []Room
	for _, key := range keys {
		var room Room
		if err := s.cache.GetJSON(ctx, key, &room); err == nil {
			rooms = append(rooms, room)
		}
	}
	return rooms, nil
}

// roomKey returns the Redis key for a room.
func roomKey(id string) string {
	return fmt.Sprintf("audio_room:%s", id)
}
