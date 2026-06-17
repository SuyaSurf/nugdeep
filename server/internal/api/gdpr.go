package api

import (
	"encoding/json"
	"net/http"

	"games.bammby.com/server/internal/auth"
)

// ExportUserData returns all personal data for GDPR portability.
func (h *Handler) ExportUserData(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	matches, _ := h.store.ListDateMatchesByPlayer(r.Context(), u.ID, 1000)
	msgs, _ := h.store.ListMessagesByUser(r.Context(), u.ID, 1000)
	communities, _ := h.store.GetCommunitiesByMember(r.Context(), u.ID)
	export := map[string]any{
		"user": map[string]any{
			"id":                u.ID,
			"username":          u.Username,
			"age_bucket":        u.AgeBucket,
			"gender_identity":   u.GenderIdentity,
			"location_label":    u.LocationLabel,
			"bio":               u.Bio,
			"categories":        u.Categories,
			"puzzles_solved":    u.PuzzlesSolved,
			"wins":              u.Wins,
			"losses":            u.Losses,
			"streak":            u.Streak,
			"longest_streak":    u.LongestStreak,
			"hide_communities":  u.HideCommunities,
			"dating_eligible":   u.DatingEligible,
			"created_at":        u.CreatedAt,
		},
		"date_matches": matches,
		"messages":     msgs,
		"communities":  communities,
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=\"bammby-export.json\"")
	_ = json.NewEncoder(w).Encode(export)
}

// DeleteAccount hard-deletes all user data (GDPR right to erasure).
func (h *Handler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if err := h.store.DeleteUser(r.Context(), u.ID); err != nil {
		respondError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
