package api

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/cache"
)

// Leaderboard returns the top N members for a given scope and scopeID.
func (h *Handler) Leaderboard(w http.ResponseWriter, r *http.Request) {
	scope := chi.URLParam(r, "scope")
	scopeID := chi.URLParam(r, "scopeID")
	if scope == "" || scopeID == "" {
		respondError(w, http.StatusBadRequest, "scope and scope_id required")
		return
	}

	n := 10
	if q := r.URL.Query().Get("n"); q != "" {
		if v, err := strconv.Atoi(q); err == nil && v > 0 && v <= 100 {
			n = v
		}
	}

	if h.cache == nil {
		respondJSON(w, http.StatusOK, map[string]any{
			"scope":    scope,
			"scope_id": scopeID,
			"entries":  []any{},
		})
		return
	}

	key := cache.LeaderboardKey(scope, scopeID)
	entries, err := h.cache.LeaderboardTop(r.Context(), key, int64(n))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "leaderboard fetch failed")
		return
	}

	out := make([]map[string]any, 0, len(entries))
	for _, e := range entries {
		out = append(out, map[string]any{
			"user_id": e.Member,
			"score":   e.Score,
		})
	}
	respondJSON(w, http.StatusOK, map[string]any{
		"scope":    scope,
		"scope_id": scopeID,
		"entries":  out,
	})
}
