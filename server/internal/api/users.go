package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/auth"
)

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{
		"id":               u.ID,
		"username":         u.Username,
		"age_bucket":       u.AgeBucket,
		"gender_identity":  u.GenderIdentity,
		"location_label":   u.LocationLabel,
		"bio":              u.Bio,
		"categories":       u.Categories,
		"puzzles_solved":   u.PuzzlesSolved,
		"wins":             u.Wins,
		"losses":           u.Losses,
		"streak":           u.Streak,
		"longest_streak":   u.LongestStreak,
		"hide_communities": u.HideCommunities,
		"dating_eligible":  u.DatingEligible,
		"created_at":       u.CreatedAt,
	})
}

func (h *Handler) GetPublicProfile(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	u, err := h.store.GetUserByUsername(r.Context(), username)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if u.HideCommunities {
		respondJSON(w, http.StatusOK, map[string]any{
			"username":       u.Username,
			"puzzles_solved": u.PuzzlesSolved,
			"wins":           u.Wins,
			"losses":         u.Losses,
			"streak":         u.Streak,
			"longest_streak": u.LongestStreak,
		})
		return
	}
	communities, _ := h.store.GetCommunitiesByMember(r.Context(), u.ID)
	respondJSON(w, http.StatusOK, map[string]any{
		"username":        u.Username,
		"age_bucket":      u.AgeBucket,
		"gender_identity": u.GenderIdentity,
		"location_label":  u.LocationLabel,
		"bio":             u.Bio,
		"categories":      u.Categories,
		"puzzles_solved":  u.PuzzlesSolved,
		"wins":            u.Wins,
		"losses":          u.Losses,
		"streak":          u.Streak,
		"longest_streak":  u.LongestStreak,
		"communities":     communities,
	})
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	var req struct {
		Username       string   `json:"username"`
		AgeBucket      string   `json:"age_bucket"`
		GenderIdentity string   `json:"gender_identity"`
		LocationLabel  string   `json:"location_label"`
		Bio            string   `json:"bio"`
		Categories     []string `json:"categories"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	u.Username = req.Username
	u.AgeBucket = req.AgeBucket
	u.GenderIdentity = req.GenderIdentity
	u.LocationLabel = req.LocationLabel
	if len(req.Bio) > 120 {
		respondError(w, http.StatusBadRequest, "bio too long (max 120)")
		return
	}
	u.Bio = req.Bio
	u.Categories = req.Categories
	// Dating eligible requires age_bucket + gender + location + categories
	if u.AgeBucket != "" && u.GenderIdentity != "" && u.LocationLabel != "" && len(u.Categories) > 0 {
		u.DatingEligible = true
	}
	if err := h.store.UpdateUser(r.Context(), u); err != nil {
		respondError(w, http.StatusInternalServerError, "update failed")
		return
	}
	respondJSON(w, http.StatusOK, u)
}
