package api

import (
	"net/http"
	"strconv"
	"time"

	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/cache"
)

// Daily returns today's puzzle, cached in Redis when available.
func (h *Handler) Daily(w http.ResponseWriter, r *http.Request) {
	date := time.Now().UTC().Format("2006-01-02")
	cacheKey := cache.DailyPuzzleKey(date)

	// Try cache first
	var cached struct {
		ID           string    `json:"id"`
		OwnerID      string    `json:"owner_id"`
		CategoryIDs  []string  `json:"category_ids"`
		Difficulty   int       `json:"difficulty"`
		TimerSeconds int       `json:"timer_seconds"`
		CreatedAt    time.Time `json:"created_at"`
	}
	if h.cache != nil {
		if err := h.cache.GetJSON(r.Context(), cacheKey, &cached); err == nil {
			respondJSON(w, http.StatusOK, cached)
			return
		}
	}

	// Fallback to DB
	today, _ := time.Parse("2006-01-02", date)
	p, err := h.store.GetDailyPuzzle(r.Context(), today)
	if err != nil {
		respondError(w, http.StatusNotFound, "no daily puzzle set")
		return
	}

	// Cache the result (strip word_set — answers stay server-side)
	payload := map[string]any{
		"id":            p.ID,
		"owner_id":      p.OwnerID,
		"category_ids":  p.CategoryIDs,
		"difficulty":    p.Difficulty,
		"timer_seconds": p.TimerSeconds,
		"created_at":    p.CreatedAt,
	}
	if h.cache != nil {
		_ = h.cache.SetJSON(r.Context(), cacheKey, payload, 24*time.Hour)
	}
	respondJSON(w, http.StatusOK, payload)
}

// Streak returns the current user's solve streak.
func (h *Handler) Streak(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	streak := u.Streak
	if h.cache != nil {
		val, err := h.cache.GetString(r.Context(), cache.UserStreakKey(u.ID))
		if err == nil {
			// Cache holds the authoritative real-time streak.
			if v, err := strconv.Atoi(val); err == nil {
				streak = v
			}
		}
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"streak":  streak,
		"user_id": u.ID,
	})
}

// BraggingCard returns streak data for shareable card rendering.
func (h *Handler) BraggingCard(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	streak := u.Streak
	if h.cache != nil {
		val, _ := h.cache.GetString(r.Context(), cache.UserStreakKey(u.ID))
		if v, err := strconv.Atoi(val); err == nil {
			streak = v
		}
	}
	shareURL := "https://games.bammby.com/profile/" + u.Username
	respondJSON(w, http.StatusOK, map[string]any{
		"username":     u.Username,
		"streak":       streak,
		"longest":      u.LongestStreak,
		"solved":       u.PuzzlesSolved,
		"share_url":    shareURL,
		"qr_data":      shareURL + "?ref=" + u.ID,
		"generated_at": time.Now().UTC(),
	})
}
