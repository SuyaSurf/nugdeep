package cache

import (
	"context"
	"testing"
	"time"
)

func TestCacheKeys(t *testing.T) {
	if got := DailyPuzzleKey("2024-06-11"); got != "daily_puzzle:2024-06-11" {
		t.Errorf("DailyPuzzleKey = %q", got)
	}
	if got := LeaderboardKey("global", "all"); got != "leaderboard:global:all" {
		t.Errorf("LeaderboardKey = %q", got)
	}
	if got := UserStreakKey("u123"); got != "user_streak:u123" {
		t.Errorf("UserStreakKey = %q", got)
	}
}

func TestCacheOperations(t *testing.T) {
	c := NewCache()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := c.Ping(ctx); err != nil {
		t.Skip("redis not available:", err)
	}

	// String round-trip
	if err := c.SetString(ctx, "test:key", "hello", time.Minute); err != nil {
		t.Fatalf("SetString: %v", err)
	}
	val, err := c.GetString(ctx, "test:key")
	if err != nil {
		t.Fatalf("GetString: %v", err)
	}
	if val != "hello" {
		t.Errorf("GetString = %q, want hello", val)
	}

	// JSON round-trip
	type item struct{ Name string }
	if err := c.SetJSON(ctx, "test:json", item{Name: "world"}, time.Minute); err != nil {
		t.Fatalf("SetJSON: %v", err)
	}
	var out item
	if err := c.GetJSON(ctx, "test:json", &out); err != nil {
		t.Fatalf("GetJSON: %v", err)
	}
	if out.Name != "world" {
		t.Errorf("GetJSON = %+v, want world", out)
	}

	// Delete
	if err := c.Delete(ctx, "test:key"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	_, err = c.GetString(ctx, "test:key")
	if err == nil {
		t.Error("expected error after delete")
	}
}

func TestCacheLeaderboard(t *testing.T) {
	c := NewCache()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := c.Ping(ctx); err != nil {
		t.Skip("redis not available:", err)
	}

	key := "test:lb"
	_ = c.LeaderboardRemove(ctx, key, "alice")
	_ = c.LeaderboardRemove(ctx, key, "bob")

	if err := c.LeaderboardAdd(ctx, key, 100, "alice"); err != nil {
		t.Fatalf("LeaderboardAdd: %v", err)
	}
	if err := c.LeaderboardAdd(ctx, key, 200, "bob"); err != nil {
		t.Fatalf("LeaderboardAdd: %v", err)
	}

	top, err := c.LeaderboardTop(ctx, key, 2)
	if err != nil {
		t.Fatalf("LeaderboardTop: %v", err)
	}
	if len(top) != 2 {
		t.Fatalf("len(top) = %d, want 2", len(top))
	}
	if top[0].Member != "bob" || top[0].Score != 200 {
		t.Errorf("top[0] = %+v, want bob/200", top[0])
	}
	if top[1].Member != "alice" || top[1].Score != 100 {
		t.Errorf("top[1] = %+v, want alice/100", top[1])
	}

	 rank, err := c.LeaderboardRank(ctx, key, "alice")
	 if err != nil {
	 	t.Fatalf("LeaderboardRank: %v", err)
	 }
	 if rank != 1 {
	 	t.Errorf("LeaderboardRank(alice) = %d, want 1", rank)
	 }
}
