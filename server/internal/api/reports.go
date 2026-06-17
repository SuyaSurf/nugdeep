package api

import (
	"encoding/json"
	"net/http"

	"games.bammby.com/server/internal/auth"
)

// ReportUser creates a report against another user.
func (h *Handler) ReportUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TargetID  string `json:"target_id"`
		MessageID string `json:"message_id,omitempty"`
		Reason    string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.TargetID == "" || req.Reason == "" {
		respondError(w, http.StatusBadRequest, "target_id and reason required")
		return
	}

	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	if err := h.store.CreateReport(r.Context(), u.ID, req.TargetID, req.MessageID, req.Reason); err != nil {
		respondError(w, http.StatusInternalServerError, "report failed")
		return
	}
	respondJSON(w, http.StatusCreated, map[string]string{"status": "reported"})
}

// BlockUser blocks the target user.
func (h *Handler) BlockUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TargetID string `json:"target_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.TargetID == "" {
		respondError(w, http.StatusBadRequest, "target_id required")
		return
	}

	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	if err := h.store.CreateBlock(r.Context(), u.ID, req.TargetID); err != nil {
		respondError(w, http.StatusInternalServerError, "block failed")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "blocked"})
}
