package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache is a thin wrapper around Redis for common patterns.
type Cache struct {
	client *redis.Client
}

// NewCache creates a Redis-backed cache from env REDIS_URL.
func NewCache() *Cache {
	addr := os.Getenv("REDIS_URL")
	if addr == "" {
		addr = "localhost:6379"
	}
	client := redis.NewClient(&redis.Options{
		Addr: addr,
	})
	return &Cache{client: client}
}

func (c *Cache) Ping(ctx context.Context) error {
	return c.client.Ping(ctx).Err()
}

// GetString fetches a plain string key.
func (c *Cache) GetString(ctx context.Context, key string) (string, error) {
	return c.client.Get(ctx, key).Result()
}

// SetString stores a plain string with TTL.
func (c *Cache) SetString(ctx context.Context, key string, value string, ttl time.Duration) error {
	return c.client.Set(ctx, key, value, ttl).Err()
}

// GetJSON unmarshals a JSON value into v.
func (c *Cache) GetJSON(ctx context.Context, key string, v any) error {
	b, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		return err
	}
	return json.Unmarshal(b, v)
}

// SetJSON marshals v to JSON and stores with TTL.
func (c *Cache) SetJSON(ctx context.Context, key string, v any, ttl time.Duration) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, key, b, ttl).Err()
}

// Delete removes a key.
func (c *Cache) Delete(ctx context.Context, key string) error {
	return c.client.Del(ctx, key).Err()
}

// DailyPuzzleKey returns the cache key for today's daily puzzle.
func DailyPuzzleKey(date string) string {
	return fmt.Sprintf("daily_puzzle:%s", date)
}

// LeaderboardKey returns a sorted-set key for a leaderboard scope.
func LeaderboardKey(scope string, scopeID string) string {
	return fmt.Sprintf("leaderboard:%s:%s", scope, scopeID)
}

// UserStreakKey returns the cache key for a user's streak.
func UserStreakKey(userID string) string {
	return fmt.Sprintf("user_streak:%s", userID)
}

// Incr atomically increments a key.
func (c *Cache) Incr(ctx context.Context, key string) *redis.IntCmd {
	return c.client.Incr(ctx, key)
}

// Expire sets a TTL on a key.
func (c *Cache) Expire(ctx context.Context, key string, ttl time.Duration) *redis.BoolCmd {
	return c.client.Expire(ctx, key, ttl)
}

// Pipeline returns a Redis pipeline for batch operations.
func (c *Cache) Pipeline(ctx context.Context) redis.Pipeliner {
	return c.client.Pipeline()
}

// LeaderboardAdd adds a score to a sorted-set leaderboard.
func (c *Cache) LeaderboardAdd(ctx context.Context, key string, score float64, member string) error {
	return c.client.ZAdd(ctx, key, redis.Z{Score: score, Member: member}).Err()
}

// LeaderboardTop returns the top N members from a leaderboard.
func (c *Cache) LeaderboardTop(ctx context.Context, key string, n int64) ([]redis.Z, error) {
	return c.client.ZRevRangeWithScores(ctx, key, 0, n-1).Result()
}

// LeaderboardRank returns the 1-based rank of a member.
func (c *Cache) LeaderboardRank(ctx context.Context, key string, member string) (int64, error) {
	return c.client.ZRevRank(ctx, key, member).Result()
}

// LeaderboardRemove removes a member from a leaderboard.
func (c *Cache) LeaderboardRemove(ctx context.Context, key string, member string) error {
	return c.client.ZRem(ctx, key, member).Err()
}

// PushTokenKey returns the Redis key for a user's push tokens.
func PushTokenKey(userID string) string {
	return fmt.Sprintf("push_tokens:%s", userID)
}

// SAdd adds members to a set.
func (c *Cache) SAdd(ctx context.Context, key string, members ...string) error {
	args := make([]any, len(members))
	for i, m := range members {
		args[i] = m
	}
	return c.client.SAdd(ctx, key, args...).Err()
}

// SMembers returns all members of a set.
func (c *Cache) SMembers(ctx context.Context, key string) ([]string, error) {
	return c.client.SMembers(ctx, key).Result()
}

// Scan iterates Redis keys matching a pattern.
func (c *Cache) Scan(ctx context.Context, pattern string, count int64) (keys []string, cursor uint64, err error) {
	return c.client.Scan(ctx, 0, pattern, count).Result()
}

func (c *Cache) Redis() *redis.Client {
	return c.client
}
