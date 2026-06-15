package lobby

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"games.bammby.com/server/internal/cache"
)

func skipNoRedis(t *testing.T) *cache.Cache {
	t.Helper()
	c := cache.NewCache()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := c.Ping(ctx); err != nil {
		t.Skip("redis not available:", err)
	}
	return c
}

func TestGetTodaysActivity_Deterministic(t *testing.T) {
	a1 := GetTodaysActivity()
	a2 := GetTodaysActivity()
	if a1.ID != a2.ID || a1.DayOfYear != a2.DayOfYear {
		t.Errorf("non-deterministic activity: %+v vs %+v", a1, a2)
	}
}

func TestSeedActivities_NotEmpty(t *testing.T) {
	acts := SeedActivities()
	if len(acts) == 0 {
		t.Fatal("SeedActivities returned empty")
	}
	for _, a := range acts {
		if a.Prompt == "" {
			t.Errorf("activity %d has empty prompt", a.ID)
		}
		if len(a.Options) == 0 {
			t.Errorf("activity %d has no options", a.ID)
		}
	}
}

func TestRandomLocations_Count(t *testing.T) {
	got := RandomLocations(3)
	if len(got) != 3 {
		t.Errorf("RandomLocations(3) = %d, want 3", len(got))
	}
}

func TestRandomLocations_Unique(t *testing.T) {
	got := RandomLocations(20)
	seen := map[string]bool{}
	for _, loc := range got {
		if seen[loc.ID] {
			t.Errorf("duplicate location: %s", loc.ID)
		}
		seen[loc.ID] = true
	}
}

func TestRandomLocations_Max(t *testing.T) {
	got := RandomLocations(100)
	if len(got) > len(LocationPool) {
		t.Errorf("RandomLocations(100) = %d, want at most %d", len(got), len(LocationPool))
	}
}

func TestJoinQueue_Match(t *testing.T) {
	c := skipNoRedis(t)
	svc := NewService(c)
	ctx := context.Background()

	entry := &QueueEntry{
		UserID:       "alice",
		Intent:       IntentSpeedDate,
		Game:         "the_button",
		ActivityCode: "activity_100",
		Choice:       "3",
		QueuedAt:     time.Now(),
	}

	resp, err := svc.JoinQueue(ctx, entry)
	if err != nil {
		t.Fatalf("JoinQueue (alice): %v", err)
	}
	if resp.Status != "queued" {
		t.Errorf("alice status = %q, want queued", resp.Status)
	}

	entry2 := &QueueEntry{
		UserID:       "bob",
		Intent:       IntentSpeedDate,
		Game:         "the_button",
		ActivityCode: "activity_100",
		Choice:       "3",
		QueuedAt:     time.Now(),
	}

	resp2, err := svc.JoinQueue(ctx, entry2)
	if err != nil {
		t.Fatalf("JoinQueue (bob): %v", err)
	}
	if resp2.Status != "matched" {
		t.Errorf("bob status = %q, want matched", resp2.Status)
	}
	if resp2.MatchID == "" {
		t.Error("bob match_id is empty")
	}

	// Cleanup: remove the match and alice's queue entry
	key := entry.CompositeKey()
	c.Redis().ZRem(ctx, key, entry2.CompositeKey())
	c.Redis().Del(ctx, matchPrefix+":"+resp2.MatchID)
}

func TestLeaveQueue(t *testing.T) {
	c := skipNoRedis(t)
	svc := NewService(c)
	ctx := context.Background()

	entry := &QueueEntry{
		UserID:       "charlie",
		Intent:       IntentMakeFriend,
		Game:         "chicken",
		ActivityCode: "activity_101",
		Choice:       "blue",
		QueuedAt:     time.Now(),
	}

	_, err := svc.JoinQueue(ctx, entry)
	if err != nil {
		t.Fatalf("JoinQueue: %v", err)
	}

	if err := svc.LeaveQueue(ctx, "charlie"); err != nil {
		t.Fatalf("LeaveQueue: %v", err)
	}

	// Should be able to rejoin immediately
	resp, err := svc.JoinQueue(ctx, entry)
	if err != nil {
		t.Fatalf("JoinQueue (rejoin): %v", err)
	}
	if resp.Status != "queued" {
		t.Errorf("rejoin status = %q, want queued", resp.Status)
	}

	// Cleanup
	_ = svc.LeaveQueue(ctx, "charlie")
}

func TestGetMatch_NotFound(t *testing.T) {
	c := skipNoRedis(t)
	svc := NewService(c)
	ctx := context.Background()

	_, err := svc.GetMatch(ctx, "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent match")
	}
}

func TestSelectAndChooseLocations(t *testing.T) {
	c := skipNoRedis(t)
	svc := NewService(c)
	ctx := context.Background()

	winnerID := "winner"
	loserID := "loser"

	match := &Match{
		ID:       "test_match_locations",
		PlayerA:  winnerID,
		PlayerB:  loserID,
		State:    "game_over",
		WinnerID: &winnerID,
		LoserID:  &loserID,
	}

	if err := svc.UpdateMatch(ctx, match); err != nil {
		t.Fatalf("UpdateMatch: %v", err)
	}

	if err := svc.SelectLocations(ctx, "test_match_locations", loserID, []string{"mountain_peak", "deep_ocean"}); err != nil {
		t.Fatalf("SelectLocations: %v", err)
	}

	matched, err := svc.ChooseLocation(ctx, "test_match_locations", winnerID, "mountain_peak")
	if err != nil {
		t.Fatalf("ChooseLocation: %v", err)
	}
	if !matched {
		t.Error("expected matched = true")
	}

	updated, err := svc.GetMatch(ctx, "test_match_locations")
	if err != nil {
		t.Fatalf("GetMatch: %v", err)
	}
	if updated.State != "chatting" {
		t.Errorf("state = %q, want chatting", updated.State)
	}

	// Cleanup
	c.Redis().Del(ctx, matchPrefix+":test_match_locations")
	c.Redis().Del(ctx, locationsKey+":test_match_locations:loser_picks")
}

func TestSelectLocations_WrongUser(t *testing.T) {
	c := skipNoRedis(t)
	svc := NewService(c)
	ctx := context.Background()

	winnerID := "alice"
	loserID := "bob"

	match := &Match{
		ID:       "test_wrong_user",
		PlayerA:  winnerID,
		PlayerB:  loserID,
		State:    "game_over",
		WinnerID: &winnerID,
		LoserID:  &loserID,
	}
	svc.UpdateMatch(ctx, match)

	err := svc.SelectLocations(ctx, "test_wrong_user", "alice", []string{"mountain_peak", "deep_ocean"})
	if err == nil {
		t.Error("expected error for winner picking locations")
	}

	c.Redis().Del(ctx, matchPrefix+":test_wrong_user")
}

func TestCleanupStaleEntries(t *testing.T) {
	c := skipNoRedis(t)
	svc := NewService(c)
	ctx := context.Background()

	entry := &QueueEntry{
		UserID:       "stale_user",
		Intent:       IntentJustPlay,
		Game:         "quick_draw",
		ActivityCode: "activity_200",
		Choice:       "7",
		QueuedAt:     time.Now().Add(-2 * queueTTL),
	}

	key := entry.CompositeKey()
	data, _ := json.Marshal(entry)
	c.Redis().ZAdd(ctx, key, redis.Z{Score: float64(entry.QueuedAt.Unix()), Member: string(data)})

	svc.CleanupStaleEntries(ctx)

	count, _ := c.Redis().ZCard(ctx, key).Result()
	if count != 0 {
		t.Errorf("expected 0 stale entries, got %d", count)
	}
}
