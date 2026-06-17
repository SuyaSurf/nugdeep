package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/store"
)

func (h *Handler) CreatePuzzle(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CategoryIDs  []string           `json:"category_ids"`
		Difficulty   int                `json:"difficulty"`
		TimerSeconds int                `json:"timer_seconds"`
		WordSet      []store.PuzzleWord `json:"word_set"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if len(req.WordSet) == 0 {
		respondError(w, http.StatusBadRequest, "word_set required")
		return
	}
	if req.TimerSeconds <= 0 {
		req.TimerSeconds = 50
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	p := &store.Puzzle{
		OwnerID:      u.ID,
		CategoryIDs:  req.CategoryIDs,
		Difficulty:   req.Difficulty,
		TimerSeconds: req.TimerSeconds,
		WordSet:      req.WordSet,
	}
	p, err = h.store.CreatePuzzle(r.Context(), p)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "create failed")
		return
	}
	respondPuzzleMeta(w, http.StatusCreated, p)
}

func (h *Handler) GetPuzzleMeta(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	p, err := h.store.GetPuzzleByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "puzzle not found")
		return
	}
	respondPuzzleMeta(w, http.StatusOK, p)
}

func respondPuzzleMeta(w http.ResponseWriter, status int, p *store.Puzzle) {
	respondJSON(w, status, map[string]any{
		"id":            p.ID,
		"owner_id":      p.OwnerID,
		"category_ids":  p.CategoryIDs,
		"difficulty":    p.Difficulty,
		"timer_seconds": p.TimerSeconds,
		"created_at":    p.CreatedAt,
	})
}
