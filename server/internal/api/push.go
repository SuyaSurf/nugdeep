package api

import (
	"encoding/json"
	"net/http"

	"games.bammby.com/server/internal/auth"
)

// RegisterPushToken stores a device token for push notifications.
func (h *Handler) RegisterPushToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Token == "" {
		respondError(w, http.StatusBadRequest, "token required")
		return
	}

	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	if err := h.push.RegisterToken(r.Context(), u.ID, req.Token); err != nil {
		respondError(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{
		"status":  "registered",
		"user_id": u.ID,
	})
}
