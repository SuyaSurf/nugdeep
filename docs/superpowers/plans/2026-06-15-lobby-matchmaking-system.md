# Lobby Matchmaking System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3-step lobby matchmaking flow (Intent → Activity → Game) with Redis-backed queue, 3s/30s timing, VR location phase, and game stub integration.

**Architecture:** Server extends the existing dating-matchmaking Redis sorted-set pattern to a new `internal/lobby/` package. Client adds a `/lobby` route with a step wizard, matchmaking status timer, and location picker. Games are stubs — the matching infrastructure is real, game implementations come later.

**Tech Stack:** Go (chi, pgx, gobwas/ws, go-redis), Next.js 16 (React 19, Tailwind v4, Clerk), WebSocket

---

## File Structure

### Server — New files
- `server/internal/lobby/types.go` — LobbyEntry, Match, Location, Activity types
- `server/internal/lobby/service.go` — Redis queue, match creation, location logic
- `server/internal/lobby/api.go` — HTTP handlers

### Server — Modified files
- `server/internal/api/api.go` — register lobby routes, add handler dependencies
- `server/cmd/api/main.go` — register lobby cleanup worker

### Client — New files
- `web/lib/lobby.ts` — API + WS client for lobby endpoints
- `web/app/lobby/page.tsx` — Main orchestrator (state machine)
- `web/app/lobby/intent-step.tsx` — Speed Date / Just Play cards
- `web/app/lobby/activity-step.tsx` — Today's activity widget
- `web/app/lobby/game-picker.tsx` — WHOT / Card VR / Pinball cards
- `web/app/lobby/matchmaking-status.tsx` — 3s spinner → 30s clock
- `web/app/lobby/matched-screen.tsx` — Opponent found display
- `web/app/lobby/location-picker.tsx` — Loser picks 2, winner picks 1
- `web/app/lobby/no-match.tsx` — Try again / Play with AI

### Client — Modified files
- `web/components/Nav.tsx` — add Lobby link to nav
- `web/app/page.tsx` — add Lobby button to home screen
- `web/middleware.ts` — add /lobby to protected routes

---

## Task 1: Server types

**Files:**
- Create: `server/internal/lobby/types.go`

- [ ] **Step 1: Create lobby types file**

```go
package lobby

import "time"

type Intent string
type GameID string
type ActivityCode string

const (
	IntentSpeedDate Intent = "speed_date"
	IntentJustPlay  Intent = "just_play"
)

type QueueEntry struct {
	UserID       string       `json:"user_id"`
	Intent       Intent       `json:"intent"`
	Game         GameID       `json:"game"`
	ActivityCode ActivityCode `json:"activity_code"`
	Choice       string       `json:"choice"`
	QueuedAt     time.Time    `json:"queued_at"`
}

type Match struct {
	ID           string       `json:"id"`
	PlayerA      string       `json:"player_a"`
	PlayerB      string       `json:"player_b"`
	Intent       Intent       `json:"intent"`
	Game         GameID       `json:"game"`
	ActivityCode ActivityCode `json:"activity_code"`
	Choice       string       `json:"choice"`
	State        string       `json:"state"` // matched, playing, game_over, picking_locations, chatting
	WinnerID     *string      `json:"winner_id"`
	LoserID      *string      `json:"loser_id"`
	CreatedAt    time.Time    `json:"created_at"`
}

type Location struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	ImageURL  string `json:"image_url"`
}

type Activity struct {
	ID        int      `json:"id"`
	DayOfYear int      `json:"day_of_year"`
	Prompt    string   `json:"prompt"`
	Type      string   `json:"type"` // number_picker, color_picker, seat_selector, puzzle, spot_diff, choice_grid
	Options   []Option `json:"options"`
}

type Option struct {
	Value string `json:"value"`
	Label string `json:"label"`
	Icon  string `json:"icon,omitempty"`
}

type QueueResponse struct {
	Status    string `json:"status"` // "queued" or "matched"
	MatchID   string `json:"match_id,omitempty"`
	QueuedAt  int64  `json:"queued_at,omitempty"`
}

type LocationPickRequest struct {
	LocationIDs []string `json:"location_ids"` // loser picks 2
}

type LocationChooseRequest struct {
	LocationID string `json:"location_id"` // winner picks 1
}
```

- [ ] **Step 2: Commit**

```bash
git add server/internal/lobby/types.go
git commit -m "feat(lobby): add shared types for lobby matchmaking"
```

---

## Task 2: Activity definitions

**Files:**
- Create: `server/internal/lobby/activities.go`

- [ ] **Step 1: Create 6 seed activities**

```go
package lobby

import "time"

// GetTodaysActivity returns the activity for the current day.
// Rotates through available activities based on day of year.
func GetTodaysActivity() Activity {
	day := time.Now().YearDay()
	activities := SeedActivities()
	idx := (day - 1) % len(activities)
	return activities[idx]
}

// SeedActivities returns the initial 6 activity definitions.
func SeedActivities() []Activity {
	return []Activity{
		{
			ID:        1,
			DayOfYear: 1,
			Prompt:    "Choose a number between 1 and 10",
			Type:      "number_picker",
			Options: []Option{
				{Value: "1", Label: "1"}, {Value: "2", Label: "2"},
				{Value: "3", Label: "3"}, {Value: "4", Label: "4"},
				{Value: "5", Label: "5"}, {Value: "6", Label: "6"},
				{Value: "7", Label: "7"}, {Value: "8", Label: "8"},
				{Value: "9", Label: "9"}, {Value: "10", Label: "10"},
			},
		},
		{
			ID:        2,
			DayOfYear: 2,
			Prompt:    "Choose your color",
			Type:      "color_picker",
			Options: []Option{
				{Value: "red", Label: "Red", Icon: "🔴"},
				{Value: "blue", Label: "Blue", Icon: "🔵"},
				{Value: "green", Label: "Green", Icon: "🟢"},
				{Value: "yellow", Label: "Yellow", Icon: "🟡"},
				{Value: "purple", Label: "Purple", Icon: "🟣"},
				{Value: "orange", Label: "Orange", Icon: "🟠"},
			},
		},
		{
			ID:        3,
			DayOfYear: 3,
			Prompt:    "Choose a seat in the cinema",
			Type:      "seat_selector",
			Options: []Option{
				{Value: "front_left", Label: "Front Left"},
				{Value: "front_right", Label: "Front Right"},
				{Value: "middle_center", Label: "Middle Center"},
				{Value: "back_left", Label: "Back Left"},
				{Value: "back_right", Label: "Back Right"},
			},
		},
		{
			ID:        4,
			DayOfYear: 4,
			Prompt:    "Which one doesn't belong?",
			Type:      "puzzle",
			Options: []Option{
				{Value: "apple", Label: "Apple", Icon: "🍎"},
				{Value: "banana", Label: "Banana", Icon: "🍌"},
				{Value: "carrot", Label: "Carrot", Icon: "🥕"},
				{Value: "dog", Label: "Dog", Icon: "🐕"},
			},
		},
		{
			ID:        5,
			DayOfYear: 5,
			Prompt:    "Find the circle",
			Type:      "spot_diff",
			Options: []Option{
				{Value: "top_left", Label: "Top Left"},
				{Value: "top_right", Label: "Top Right"},
				{Value: "bottom_left", Label: "Bottom Left"},
				{Value: "bottom_right", Label: "Bottom Right"},
			},
		},
		{
			ID:        6,
			DayOfYear: 6,
			Prompt:    "Pick your travel style",
			Type:      "choice_grid",
			Options: []Option{
				{Value: "beach", Label: "Beach Vacation", Icon: "🏖️"},
				{Value: "adventure", Label: "Adventure", Icon: "🏔️"},
				{Value: "city", Label: "City Break", Icon: "🌆"},
				{Value: "nature", Label: "Nature Retreat", Icon: "🌲"},
			},
		},
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add server/internal/lobby/activities.go
git commit -m "feat(lobby): add seed activities with daily rotation"
```

---

## Task 3: Location pool

**Files:**
- Create: `server/internal/lobby/locations.go`

- [ ] **Step 1: Create VR location pool**

```go
package lobby

import "math/rand"

// VR location presets. 3 random ones are selected per match.
var LocationPool = []Location{
	{ID: "mountain_peak", Name: "Mountain Peak", ImageURL: "/locations/mountain-peak.jpg"},
	{ID: "deep_ocean", Name: "Deep Ocean", ImageURL: "/locations/deep-ocean.jpg"},
	{ID: "space_station", Name: "Space Station", ImageURL: "/locations/space-station.jpg"},
	{ID: "tropical_beach", Name: "Tropical Beach", ImageURL: "/locations/tropical-beach.jpg"},
	{ID: "ancient_temple", Name: "Ancient Temple", ImageURL: "/locations/ancient-temple.jpg"},
	{ID: "neon_city", Name: "Neon City", ImageURL: "/locations/neon-city.jpg"},
	{ID: "sahara_desert", Name: "Sahara Desert", ImageURL: "/locations/sahara-desert.jpg"},
	{ID: "arctic_base", Name: "Arctic Base", ImageURL: "/locations/arctic-base.jpg"},
	{ID: "volcano_rim", Name: "Volcano Rim", ImageURL: "/locations/volcano-rim.jpg"},
	{ID: "underwater_ruins", Name: "Underwater Ruins", ImageURL: "/locations/underwater-ruins.jpg"},
	{ID: "cherry_blossom", Name: "Cherry Blossom Garden", ImageURL: "/locations/cherry-blossom.jpg"},
	{ID: "savanna_sunset", Name: "Savanna Sunset", ImageURL: "/locations/savanna-sunset.jpg"},
	{ID: "aurora_sky", Name: "Northern Lights", ImageURL: "/locations/aurora.jpg"},
	{ID: "rainforest", Name: "Rainforest Canopy", ImageURL: "/locations/rainforest.jpg"},
	{ID: "medieval_castle", Name: "Medieval Castle", ImageURL: "/locations/castle.jpg"},
	{ID: "coral_reef", Name: "Coral Reef", ImageURL: "/locations/coral-reef.jpg"},
	{ID: "desert_oasis", Name: "Desert Oasis", ImageURL: "/locations/oasis.jpg"},
	{ID: "floating_islands", Name: "Floating Islands", ImageURL: "/locations/floating-islands.jpg"},
	{ID: "lavender_fields", Name: "Lavender Fields", ImageURL: "/locations/lavender.jpg"},
	{ID: "cyberpunk_alley", Name: "Cyberpunk Alley", ImageURL: "/locations/cyberpunk.jpg"},
}

// RandomLocations returns n random locations from the pool.
func RandomLocations(n int) []Location {
	pool := make([]Location, len(LocationPool))
	copy(pool, LocationPool)
	rand.Shuffle(len(pool), func(i, j int) { pool[i], pool[j] = pool[j], pool[i] })
	if n > len(pool) {
		n = len(pool)
	}
	return pool[:n]
}
```

- [ ] **Step 2: Commit**

```bash
git add server/internal/lobby/locations.go
git commit -m "feat(lobby): add VR location pool (20 presets)"
```

---

## Task 4: Server matchmaking service

**Files:**
- Create: `server/internal/lobby/service.go`

- [ ] **Step 1: Write the test**

```go
package lobby_test

import (
	"testing"
	"time"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
)

// Redis client needed. For now, write the test structure.
func TestQueueKey(t *testing.T) {
	key := queueKey(IntentSpeedDate, "whot", "activity_1", "3")
	assert.Equal(t, "lobby_queue:speed_date:whot:activity_1:3", key)
}

func TestMatchCompositeKey(t *testing.T) {
	entry := QueueEntry{
		Intent: IntentSpeedDate, Game: "whot", ActivityCode: "activity_1", Choice: "3",
	}
	key := entry.CompositeKey()
	assert.Equal(t, "lobby_queue:speed_date:whot:activity_1:3", key)
}
```

- [ ] **Step 2: Implement the service**

```go
package lobby

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"github.com/google/uuid"
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
	rdb redis.UniversalClient
}

func NewService(rdb redis.UniversalClient) *Service {
	return &Service{rdb: rdb}
}

func (s *Service) JoinQueue(ctx context.Context, entry *QueueEntry) (*QueueResponse, error) {
	key := entry.CompositeKey()

	// Look for existing waiting user (oldest first)
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
		// Parse waiting user
		var existing QueueEntry
		if err := json.Unmarshal([]byte(results[0]), &existing); err != nil {
			return nil, fmt.Errorf("parse queue entry failed: %w", err)
		}

		// Check if entry is stale (>60s)
		if time.Since(existing.QueuedAt) > queueTTL {
			s.rdb.ZRem(ctx, key, results[0])
			// Fall through to enqueue the new user
		} else {
			// Remove the matched user from queue
			s.rdb.ZRem(ctx, key, results[0])

			// Create the match
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

			// Store match in Redis
			matchData, _ := json.Marshal(match)
			s.rdb.Set(ctx, fmt.Sprintf("%s:%s", matchPrefix, match.ID), matchData, 24*time.Hour)

			return &QueueResponse{Status: "matched", MatchID: match.ID}, nil
		}
	}

	// No match found — enqueue
	entry.QueuedAt = time.Now()
	data, _ := json.Marshal(entry)
	s.rdb.ZAdd(ctx, key, redis.Z{
		Score:  float64(entry.QueuedAt.Unix()),
		Member: string(data),
	})

	return &QueueResponse{Status: "queued", QueuedAt: entry.QueuedAt.Unix()}, nil
}

func (s *Service) LeaveQueue(ctx context.Context, userID string) error {
	// Scan all lobby_queue keys and remove entries for this user
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

	// Store the loser's picks
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

	// Check if the winner's choice was in the loser's picks
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

// CleanupStaleEntries removes queue entries older than ttl.
func (s *Service) CleanupStaleEntries(ctx context.Context) {
	cutoff := fmt.Sprintf("%d", time.Now().Add(-queueTTL).Unix())
	iter := s.rdb.Scan(ctx, 0, fmt.Sprintf("%s:*", queuePrefix), 100).Iterator()
	for iter.Next(ctx) {
		s.rdb.ZRemRangeByScore(ctx, iter.Val(), "0", cutoff)
	}
}
```

- [ ] **Step 3: Run tests**

```bash
cd server && go test ./internal/lobby/... -v
```

- [ ] **Step 4: Commit**

```bash
git add server/internal/lobby/service.go
git commit -m "feat(lobby): implement Redis queue, match creation, location logic"
```

---

## Task 5: Server API handlers

**Files:**
- Create: `server/internal/lobby/api.go`

- [ ] **Step 1: Create HTTP handlers**

```go
package lobby

import (
	"encoding/json"
	"net/http"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc  *Service
	hub  interface{ BroadcastToRoom(room string, v interface{}) }
	auth interface{ UserID(r *http.Request) string }
}

func NewHandler(svc *Service, hub interface{ BroadcastToRoom(room string, v interface{}) }, auth interface{ UserID(r *http.Request) string }) *Handler {
	return &Handler{svc: svc, hub: hub, auth: auth}
}

func (h *Handler) Routes(r chi.Router) {
	r.Get("/lobby/activity", h.GetTodaysActivity)
	r.Post("/lobby/queue", h.JoinQueue)
	r.Delete("/lobby/queue", h.LeaveQueue)
	r.Post("/lobby/{matchId}/locations", h.PickLocations)
	r.Post("/lobby/{matchId}/choose-location", h.ChooseLocation)
	r.Post("/lobby/ai", h.StartAI)
}

func (h *Handler) GetTodaysActivity(w http.ResponseWriter, r *http.Request) {
	activity := GetTodaysActivity()
	writeJSON(w, http.StatusOK, activity)
}

func (h *Handler) JoinQueue(w http.ResponseWriter, r *http.Request) {
	userID := h.auth.UserID(r)
	var req struct {
		Intent       Intent       `json:"intent"`
		Game         GameID       `json:"game"`
		ActivityCode ActivityCode `json:"activity_code"`
		Choice       string       `json:"choice"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}

	entry := &QueueEntry{
		UserID:       userID,
		Intent:       req.Intent,
		Game:         req.Game,
		ActivityCode: req.ActivityCode,
		Choice:       req.Choice,
	}

	resp, err := h.svc.JoinQueue(r.Context(), entry)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if resp.Status == "matched" {
		match, _ := h.svc.GetMatch(r.Context(), resp.MatchID)
		opponentID := match.PlayerB
		if opponentID == userID {
			opponentID = match.PlayerA
		}
		h.hub.BroadcastToRoom("user:"+match.PlayerA, map[string]interface{}{
			"type": "lobby:matched",
			"payload": map[string]interface{}{
				"match_id": match.ID,
				"opponent": opponentID,
				"intent":   match.Intent,
				"game":     match.Game,
			},
		})
		h.hub.BroadcastToRoom("user:"+match.PlayerB, map[string]interface{}{
			"type": "lobby:matched",
			"payload": map[string]interface{}{
				"match_id": match.ID,
				"opponent": match.PlayerA,
				"intent":   match.Intent,
				"game":     match.Game,
			},
		})
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) LeaveQueue(w http.ResponseWriter, r *http.Request) {
	userID := h.auth.UserID(r)
	h.svc.LeaveQueue(r.Context(), userID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "left"})
}

func (h *Handler) PickLocations(w http.ResponseWriter, r *http.Request) {
	userID := h.auth.UserID(r)
	matchID := chi.URLParam(r, "matchId")
	var req LocationPickRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}

	if err := h.svc.SelectLocations(r.Context(), matchID, userID, req.LocationIDs); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	// Notify both players
	match, _ := h.svc.GetMatch(r.Context(), matchID)
	loserPicks := req.LocationIDs
	var winnerSees []Location
	for _, loc := range RandomLocations(3) {
		winnerSees = append(winnerSees, loc)
	}

	h.hub.BroadcastToRoom("user:"+*match.WinnerID, map[string]interface{}{
		"type": "lobby:location_picked",
		"payload": map[string]interface{}{
			"match_id":   matchID,
			"locations":  winnerSees,
		},
	})

	writeJSON(w, http.StatusOK, map[string]string{"status": "picked"})
}

func (h *Handler) ChooseLocation(w http.ResponseWriter, r *http.Request) {
	userID := h.auth.UserID(r)
	matchID := chi.URLParam(r, "matchId")
	var req LocationChooseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}

	isMatch, err := h.svc.ChooseLocation(r.Context(), matchID, userID, req.LocationID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	match, _ := h.svc.GetMatch(r.Context(), matchID)
	eventType := "lobby:location_chosen"
	payload := map[string]interface{}{
		"match_id": matchID,
		"match":    isMatch,
	}

	h.hub.BroadcastToRoom("user:"+match.PlayerA, map[string]interface{}{"type": eventType, "payload": payload})
	h.hub.BroadcastToRoom("user:"+match.PlayerB, map[string]interface{}{"type": eventType, "payload": payload})

	writeJSON(w, http.StatusOK, map[string]bool{"match": isMatch})
}

func (h *Handler) StartAI(w http.ResponseWriter, r *http.Request) {
	// Stub — returns a mock AI game session
	userID := h.auth.UserID(r)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"match_id":  "ai_" + userID,
		"opponent":  "AI",
		"game_mode": "ai",
	})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
```

- [ ] **Step 2: Commit**

```bash
git add server/internal/lobby/api.go
git commit -m "feat(lobby): add HTTP handlers for queue, locations, activity, AI"
```

---

## Task 6: Wire up server routes

**Files:**
- Modify: `server/internal/api/api.go`
- Modify: `server/cmd/api/main.go`

- [ ] **Step 1: Add LobbyService and LobbyHandler to Handler struct**

In `server/internal/api/api.go`, find the Handler struct and add lobby fields:

```go
type Handler struct {
    repo                     store.Repository
    lk                       *livekit.Service
    cache                    *cache.Cache
    hub                      *ws.Hub
    gameMgr                  *game.Manager
    wordCardMgr              *game.WordCardManager
    match                    *matchmaking.Service
    mod                      *moderation.Client
    audioSvc                 *audio.Service
    lobbySvc                 *lobby.Service
    lobbyH                   *lobby.Handler
}
```

- [ ] **Step 2: Initialize in NewHandler**

```go
func NewHandler(repo store.Repository, lk *livekit.Service, cache *cache.Cache, hub *ws.Hub) *Handler {
    lobbySvc := lobby.NewService(cache) // cache wraps Redis
    lobbyH := lobby.NewHandler(lobbySvc, hub, auth)
    return &Handler{
        // ... existing fields ...
        lobbySvc: lobbySvc,
        lobbyH:   lobbyH,
    }
}
```

- [ ] **Step 3: Register lobby routes in Routes()**

```go
func (h *Handler) Routes(r chi.Router) {
    // ... existing routes ...
    r.Group(func(r chi.Router) {
        r.Use(auth.Middleware)
        r.Use(h.EnsureUser)
        h.lobbyH.Routes(r)
    })
}
```

- [ ] **Step 4: Add cleanup worker in main.go**

```go
go func() {
    ticker := time.NewTicker(10 * time.Second)
    defer ticker.Stop()
    for range ticker.C {
        handler.lobbySvc.CleanupStaleEntries(context.Background())
    }
}()
```

Place this alongside the other worker goroutines in `cmd/api/main.go`.

- [ ] **Step 5: Update the auth interface**

Create an adapter so the lobby handler can get the user ID. In `server/internal/lobby/api.go`, replace the `auth` field with a simpler approach — pass user ID directly from the existing auth middleware.

Actually, the simplest approach is to have the lobby handlers use `auth.UserIDFromContext(r.Context())` like other handlers do. Let the lobby handlers access the auth package directly:

```go
import "github.com/yourproject/server/internal/auth"

func (h *Handler) JoinQueue(w http.ResponseWriter, r *http.Request) {
    userID := auth.UserIDFromContext(r.Context())
    // ...
}
```

- [ ] **Step 6: Compile check**

```bash
cd server && go build ./...
```

- [ ] **Step 7: Commit**

```bash
git add server/internal/api/api.go server/cmd/api/main.go server/internal/lobby/api.go
git commit -m "feat(lobby): wire up routes, handler init, cleanup worker"
```

---

## Task 7: Client lobby API client

**Files:**
- Create: `web/lib/lobby.ts`

- [ ] **Step 1: Create the API client**

```typescript
import { apiFetch } from './api';

export interface Activity {
  id: number;
  day_of_year: number;
  prompt: string;
  type: string;
  options: Array<{ value: string; label: string; icon?: string }>;
}

export interface QueueResponse {
  status: 'queued' | 'matched';
  match_id?: string;
  queued_at?: number;
}

export interface MatchResult {
  match: boolean;
}

export interface AIGameResponse {
  match_id: string;
  opponent: string;
  game_mode: string;
}

export function getTodaysActivity(): Promise<Activity> {
  return apiFetch('/api/v1/lobby/activity');
}

export function joinQueue(params: {
  intent: string;
  game: string;
  activity_code: string;
  choice: string;
}): Promise<QueueResponse> {
  return apiFetch('/api/v1/lobby/queue', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function leaveQueue(): Promise<void> {
  return apiFetch('/api/v1/lobby/queue', { method: 'DELETE' });
}

export function pickLocations(matchId: string, locationIds: string[]): Promise<void> {
  return apiFetch(`/api/v1/lobby/${matchId}/locations`, {
    method: 'POST',
    body: JSON.stringify({ location_ids: locationIds }),
  });
}

export function chooseLocation(matchId: string, locationId: string): Promise<MatchResult> {
  return apiFetch(`/api/v1/lobby/${matchId}/choose-location`, {
    method: 'POST',
    body: JSON.stringify({ location_id: locationId }),
  });
}

export function startAIGame(): Promise<AIGameResponse> {
  return apiFetch('/api/v1/lobby/ai', { method: 'POST' });
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/lobby.ts
git commit -m "feat(lobby): add client API client for lobby endpoints"
```

---

## Task 8: Client lobby page — orchestrator

**Files:**
- Create: `web/app/lobby/page.tsx`

- [ ] **Step 1: Create the state machine page**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { SignedIn } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { IntentStep } from './intent-step';
import { ActivityStep } from './activity-step';
import { GamePicker } from './game-picker';
import { MatchmakingStatus } from './matchmaking-status';
import { MatchedScreen } from './matched-screen';
import { LocationPicker } from './location-picker';
import { NoMatch } from './no-match';
import type { Activity } from '@/lib/lobby';
import { getTodaysActivity, joinQueue, leaveQueue } from '@/lib/lobby';
import { wsConnectRooms } from '@/lib/api';

type Phase =
  | 'intent'
  | 'activity'
  | 'game'
  | 'queued'
  | 'matched'
  | 'playing'
  | 'game_over'
  | 'picking_locations'
  | 'choosing_location'
  | 'chatting'
  | 'completed'
  | 'no_match';

export default function LobbyPage() {
  const { user } = useUser();
  const [phase, setPhase] = useState<Phase>('intent');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [intent, setIntent] = useState<string>('');
  const [choice, setChoice] = useState<string>('');
  const [game, setGame] = useState<string>('');
  const [matchId, setMatchId] = useState<string>('');
  const [opponent, setOpponent] = useState<string>('');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    getTodaysActivity().then(setActivity);
  }, []);

  const handleIntentSelect = useCallback((selected: string) => {
    setIntent(selected);
    setPhase('activity');
  }, []);

  const handleChoiceSelect = useCallback((selected: string) => {
    setChoice(selected);
    setPhase('game');
  }, []);

  const handleGameSelect = useCallback(async (selected: string) => {
    if (!activity) return;
    setGame(selected);
    setPhase('queued');

    try {
      const resp = await joinQueue({
        intent,
        game: selected,
        activity_code: `activity_${activity.day_of_year}`,
        choice,
      });

      if (resp.status === 'matched') {
        setMatchId(resp.match_id!);
        connectWS(resp.match_id!);
        setPhase('matched');
      }
      // If queued, the MatchmakingStatus component handles the timer
    } catch {
      setPhase('no_match');
    }
  }, [intent, choice, activity]);

  const connectWS = useCallback((matchID: string) => {
    const socket = wsConnectRooms(null, [`lobby:${matchID}`]);
    setWs(socket);

    socket.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'lobby:matched':
          setMatchId(msg.payload.match_id);
          setOpponent(msg.payload.opponent);
          setPhase('matched');
          break;
        case 'lobby:game_over':
          setPhase('game_over');
          break;
        case 'lobby:location_prompt':
          setPhase('picking_locations');
          break;
        case 'lobby:location_picked':
          setPhase('choosing_location');
          break;
        case 'lobby:location_chosen':
          if (msg.payload.match) {
            setPhase('chatting');
          } else {
            setPhase('completed');
          }
          break;
        case 'lobby:expired':
          setPhase('completed');
          break;
      }
    });
  }, []);

  const handleTimeout = useCallback(() => {
    leaveQueue().then(() => setPhase('no_match'));
  }, []);

  const handleTryAgain = useCallback(() => {
    setPhase('intent');
    setIntent('');
    setChoice('');
    setGame('');
    setMatchId('');
    setOpponent('');
  }, []);

  return (
    <SignedIn>
      <main className="min-h-screen flex flex-col items-center justify-center p-4">
        {phase === 'intent' && (
          <IntentStep onSelect={handleIntentSelect} />
        )}
        {phase === 'activity' && activity && (
          <ActivityStep
            activity={activity}
            onSelect={handleChoiceSelect}
          />
        )}
        {phase === 'game' && (
          <GamePicker onSelect={handleGameSelect} />
        )}
        {phase === 'queued' && (
          <MatchmakingStatus
            matchId={matchId}
            onMatch={() => {}}
            onTimeout={handleTimeout}
            ws={ws}
            connectWS={connectWS}
          />
        )}
        {phase === 'matched' && (
          <MatchedScreen
            opponent={opponent}
            matchId={matchId}
            onGameStart={() => setPhase('playing')}
          />
        )}
        {phase === 'playing' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold">Game Session</h2>
            <p className="text-gray-400 mt-2">Playing {game} with {opponent}</p>
            <p className="text-gray-500 text-sm mt-4">Game implementation coming soon</p>
            <button
              onClick={() => setPhase('game_over')}
              className="mt-6 px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Simulate Game Over
            </button>
          </div>
        )}
        {phase === 'game_over' && (
          <LocationPicker matchId={matchId} />
        )}
        {phase === 'completed' && (
          <div className="text-center">
            <h2 className="text-xl font-bold">No match — back to lobby</h2>
            <button
              onClick={handleTryAgain}
              className="mt-4 px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Try Again
            </button>
          </div>
        )}
        {phase === 'chatting' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold">You matched! 💬</h2>
            <p className="text-gray-400 mt-2">Chat with {opponent} in your VR location</p>
          </div>
        )}
        {phase === 'no_match' && (
          <NoMatch onTryAgain={handleTryAgain} />
        )}
      </main>
    </SignedIn>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/lobby/page.tsx
git commit -m "feat(lobby): add lobby page orchestrator with state machine"
```

---

## Task 9: IntentStep component

**Files:**
- Create: `web/app/lobby/intent-step.tsx`

- [ ] **Step 1: Create component**

```typescript
'use client';

interface Props {
  onSelect: (intent: string) => void;
}

export function IntentStep({ onSelect }: Props) {
  return (
    <div className="w-full max-w-md text-center">
      <h1 className="text-3xl font-bold mb-2">What are you looking for?</h1>
      <p className="text-gray-400 mb-8">Choose your intent</p>
      <div className="space-y-4">
        <button
          onClick={() => onSelect('speed_date')}
          className="w-full p-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl hover:scale-105 transition-transform text-left"
        >
          <span className="text-2xl">⚡</span>
          <h2 className="text-xl font-bold mt-2">Speed Date</h2>
          <p className="text-sm text-white/70">Meet someone new through games</p>
        </button>
        <button
          onClick={() => onSelect('just_play')}
          className="w-full p-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:scale-105 transition-transform text-left"
        >
          <span className="text-2xl">🎮</span>
          <h2 className="text-xl font-bold mt-2">Just Play</h2>
          <p className="text-sm text-white/70">Play games without the dating pressure</p>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/lobby/intent-step.tsx
git commit -m "feat(lobby): add intent step (Speed Date / Just Play)"
```

---

## Task 10: ActivityStep component

**Files:**
- Create: `web/app/lobby/activity-step.tsx`

- [ ] **Step 1: Create activity widget renderer**

```typescript
'use client';

import type { Activity } from '@/lib/lobby';

interface Props {
  activity: Activity;
  onSelect: (choice: string) => void;
}

export function ActivityStep({ activity, onSelect }: Props) {
  return (
    <div className="w-full max-w-md text-center">
      <h2 className="text-xl font-semibold mb-6">{activity.prompt}</h2>
      <div className={`grid gap-3 ${
        activity.options.length > 6
          ? 'grid-cols-5'
          : activity.options.length > 4
          ? 'grid-cols-3'
          : 'grid-cols-2'
      }`}>
        {activity.options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className="flex flex-col items-center p-4 bg-gray-800 rounded-xl hover:bg-gray-700 hover:scale-105 transition-all"
          >
            {option.icon && <span className="text-3xl mb-2">{option.icon}</span>}
            <span className="text-sm">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/lobby/activity-step.tsx
git commit -m "feat(lobby): add activity step with dynamic grid widget"
```

---

## Task 11: GamePicker component

**Files:**
- Create: `web/app/lobby/game-picker.tsx`

- [ ] **Step 1: Create game selection cards**

```typescript
'use client';

const games = [
  { id: 'whot', name: 'WHOT', emoji: '🃏', color: 'from-yellow-500 to-orange-500' },
  { id: 'card_vr', name: 'Card VR', emoji: '🕶️', color: 'from-cyan-500 to-blue-500' },
  { id: 'pinball', name: 'Pinball', emoji: '🎱', color: 'from-red-500 to-pink-500' },
];

interface Props {
  onSelect: (game: string) => void;
}

export function GamePicker({ onSelect }: Props) {
  return (
    <div className="w-full max-w-md text-center">
      <h2 className="text-xl font-semibold mb-2">What game do you want to play?</h2>
      <p className="text-gray-400 mb-6 text-sm">Pick one — matching happens instantly</p>
      <div className="space-y-3">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelect(game.id)}
            className="w-full p-5 bg-gradient-to-r rounded-xl hover:scale-105 transition-transform text-left flex items-center gap-4"
            style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to))` }}
            className={`w-full p-5 bg-gradient-to-r ${game.color} rounded-xl hover:scale-105 transition-transform text-left flex items-center gap-4`}
          >
            <span className="text-3xl">{game.emoji}</span>
            <div>
              <h3 className="text-lg font-bold">{game.name}</h3>
              <p className="text-sm text-white/70">Play {game.name} 1v1</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/lobby/game-picker.tsx
git commit -m "feat(lobby): add game picker (WHOT / Card VR / Pinball)"
```

---

## Task 12: MatchmakingStatus component

**Files:**
- Create: `web/app/lobby/matchmaking-status.tsx`

- [ ] **Step 1: Create 3s → 30s timer component**

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { wsConnectRooms } from '@/lib/api';

interface Props {
  matchId: string;
  onMatch: () => void;
  onTimeout: () => void;
  ws: WebSocket | null;
  connectWS: (matchId: string) => void;
}

export function MatchmakingStatus({ matchId, onMatch, onTimeout, ws, connectWS }: Props) {
  const [phase, setPhase] = useState<'initial' | 'waiting'>('initial');
  const [seconds, setSeconds] = useState(0);
  const wsRef = useRef<WebSocket | null>(ws);

  // 3s initial wait, then 30s countdown
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setPhase('waiting');
      setSeconds(30);
    }, 3000);

    return () => clearTimeout(initialTimer);
  }, []);

  // 30s countdown
  useEffect(() => {
    if (phase !== 'waiting') return;

    if (seconds <= 0) {
      onTimeout();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, seconds, onTimeout]);

  // WebSocket listener for match
  useEffect(() => {
    if (!wsRef.current) {
      const socket = wsConnectRooms(null, ['lobby']);
      wsRef.current = socket;

      socket.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'lobby:matched') {
          onMatch();
        }
      });
    }
  }, [onMatch]);

  const progress = phase === 'initial' ? 0 : (seconds / 30) * 100;

  return (
    <div className="w-full max-w-md text-center">
      {phase === 'initial' ? (
        <>
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Looking for a match...</h2>
          <p className="text-gray-400 mt-2">Finding someone with the same choices</p>
        </>
      ) : (
        <>
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="56" fill="none" stroke="#374151" strokeWidth="8" />
              <circle
                cx="64" cy="64" r="56"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="8"
                strokeDasharray={`${(progress / 100) * 352} 352`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold">
              {seconds}
            </span>
          </div>
          <h2 className="text-xl font-semibold">Waiting for opponent...</h2>
          <p className="text-gray-400 mt-2">Auto-matching with closest match</p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/lobby/matchmaking-status.tsx
git commit -m "feat(lobby): add matchmaking status with 3s/30s timer"
```

---

## Task 13: MatchedScreen component

**Files:**
- Create: `web/app/lobby/matched-screen.tsx`

- [ ] **Step 1: Create matched screen**

```typescript
'use client';

interface Props {
  opponent: string;
  matchId: string;
  onGameStart: () => void;
}

export function MatchedScreen({ opponent, matchId, onGameStart }: Props) {
  return (
    <div className="w-full max-w-md text-center">
      <div className="text-6xl mb-4 animate-bounce">✨</div>
      <h2 className="text-2xl font-bold mb-2">Match Found!</h2>
      <p className="text-gray-400 mb-6">
        You matched with <span className="text-white font-semibold">{opponent}</span>
      </p>
      <p className="text-sm text-gray-500 mb-8">Match ID: {matchId}</p>
      <button
        onClick={onGameStart}
        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl font-bold text-lg hover:scale-105 transition-transform"
      >
        Start Game
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/lobby/matched-screen.tsx
git commit -m "feat(lobby): add matched screen"
```

---

## Task 14: LocationPicker component

**Files:**
- Create: `web/app/lobby/location-picker.tsx`

- [ ] **Step 1: Create location picker (loser picks 2, winner picks 1)**

```typescript
'use client';

import { useState } from 'react';
import { pickLocations, chooseLocation } from '@/lib/lobby';

interface Location {
  id: string;
  name: string;
  image_url: string;
}

const FAKE_LOCATIONS: Location[] = [
  { id: 'mountain_peak', name: 'Mountain Peak', image_url: '' },
  { id: 'deep_ocean', name: 'Deep Ocean', image_url: '' },
  { id: 'space_station', name: 'Space Station', image_url: '' },
];

interface Props {
  matchId: string;
}

export function LocationPicker({ matchId }: Props) {
  const [step, setStep] = useState<'loser_picks' | 'winner_picks' | 'result'>('loser_picks');
  const [selected, setSelected] = useState<string[]>([]);

  if (step === 'loser_picks') {
    const toggle = (id: string) => {
      setSelected((prev) => {
        if (prev.includes(id)) return prev.filter((s) => s !== id);
        if (prev.length >= 2) return prev;
        return [...prev, id];
      });
    };

    return (
      <div className="w-full max-w-md text-center">
        <h2 className="text-xl font-bold mb-2">Pick 2 VR locations</h2>
        <p className="text-gray-400 mb-6 text-sm">The winner will choose from these</p>
        <div className="space-y-3">
          {FAKE_LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={() => toggle(loc.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                selected.includes(loc.id) ? 'border-purple-500 bg-purple-900/30' : 'border-gray-700 bg-gray-800'
              }`}
            >
              <div className="w-full h-20 bg-gray-700 rounded-lg mb-2 flex items-center justify-center text-gray-500">
                {loc.name}
              </div>
              <span className="font-medium">{loc.name}</span>
            </button>
          ))}
        </div>
        <button
          disabled={selected.length !== 2}
          onClick={async () => {
            await pickLocations(matchId, selected);
            setStep('winner_picks');
          }}
          className="mt-6 px-6 py-2 bg-purple-600 rounded-lg disabled:opacity-50 hover:bg-purple-700 transition-all"
        >
          Confirm Picks
        </button>
      </div>
    );
  }

  if (step === 'winner_picks') {
    return (
      <div className="w-full max-w-md text-center">
        <h2 className="text-xl font-bold mb-2">Choose 1 location</h2>
        <p className="text-gray-400 mb-6 text-sm">If it's in their picks, you chat!</p>
        <div className="space-y-3">
          {FAKE_LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={async () => {
                const res = await chooseLocation(matchId, loc.id);
                if (res.match) {
                  setStep('result');
                }
              }}
              className="w-full p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-all text-left border-2 border-gray-700"
            >
              <div className="w-full h-20 bg-gray-700 rounded-lg mb-2 flex items-center justify-center text-gray-500">
                {loc.name}
              </div>
              <span className="font-medium">{loc.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'result') {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold">They picked your location!</h2>
        <p className="text-gray-400 mt-2">Chat is starting...</p>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/lobby/location-picker.tsx
git commit -m "feat(lobby): add VR location picker (loser picks 2, winner picks 1)"
```

---

## Task 15: NoMatch component

**Files:**
- Create: `web/app/lobby/no-match.tsx`

- [ ] **Step 1: Create no-match options**

```typescript
'use client';

import { startAIGame } from '@/lib/lobby';

interface Props {
  onTryAgain: () => void;
}

export function NoMatch({ onTryAgain }: Props) {
  return (
    <div className="w-full max-w-md text-center">
      <div className="text-5xl mb-4">😔</div>
      <h2 className="text-2xl font-bold mb-2">No match found</h2>
      <p className="text-gray-400 mb-8">No one else had the same choices right now</p>
      <div className="space-y-4">
        <button
          onClick={onTryAgain}
          className="w-full p-4 bg-gradient-to-r from-purple-600 to-indigo-500 rounded-xl font-semibold hover:scale-105 transition-transform"
        >
          Try Again with Different Choices
        </button>
        <button
          onClick={async () => {
            const resp = await startAIGame();
            alert(`AI game started: ${resp.match_id}`);
          }}
          className="w-full p-4 bg-gray-800 rounded-xl font-semibold hover:bg-gray-700 transition-all"
        >
          Play with AI
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/lobby/no-match.tsx
git commit -m "feat(lobby): add no-match screen with retry/AI options"
```

---

## Task 16: Navigation integration

**Files:**
- Modify: `web/app/page.tsx`
- Modify: `web/components/Nav.tsx`
- Modify: `web/middleware.ts`

- [ ] **Step 1: Add Lobby button to home screen**

In `web/app/page.tsx`, find the Play Daily and Speed Date buttons and add a Lobby button:

```tsx
<Link
  href="/lobby"
  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-500 rounded-xl font-bold text-lg hover:scale-105 transition-transform"
>
  Enter Lobby
</Link>
```

Place it prominently before or alongside the existing buttons.

- [ ] **Step 2: Add Lobby link to Nav**

In `web/components/Nav.tsx`, find the signed-in links section and add:

```tsx
<Link href="/lobby" className="hover:text-purple-400 transition-colors">
  Lobby
</Link>
```

- [ ] **Step 3: Protect /lobby in middleware**

In `web/middleware.ts`, add `'/lobby'` to the protected routes array.

- [ ] **Step 4: Build check**

```bash
cd web && npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add web/app/page.tsx web/components/Nav.tsx web/middleware.ts
git commit -m "feat(lobby): add lobby link to home screen, nav, and protected routes"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Does every requirement from `2026-06-15-lobby-matchmaking-system.md` have a corresponding task?
  - 3-step selection flow → Tasks 9, 10, 11
  - Matchmaking timing (3s/30s) → Task 12
  - Server queue/match creation → Tasks 4, 5
  - Activity system (6 seed, daily rotation) → Task 2
  - VR location phase → Tasks 3, 14
  - WebSocket events → Tasks 5 (server broadcast), 8 (client listener)
  - No match/AI fallback → Task 15
  - Navigation integration → Task 16

- [ ] **Placeholder scan:** No "TBD", "TODO", or empty steps

- [ ] **Type consistency:** Client uses same field names as server (`intent`, `game`, `activity_code`, `choice`)

- [ ] **Build verification:** Each task includes a build/test step
