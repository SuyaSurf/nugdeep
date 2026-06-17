package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"games.bammby.com/server/internal/auth"
)

func (h *Handler) LiveKitWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, "bad body")
		return
	}
	// Verify LiveKit webhook auth header: Bearer <jwt>
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		respondError(w, http.StatusUnauthorized, "missing auth")
		return
	}
	// Validate JWT signature (LiveKit uses HS256 with api secret)
	// For MVP we accept all valid-looking webhooks; production should verify.
	var event struct {
		Event string `json:"event"`
		Room  struct {
			Name  string `json:"name"`
			Sid   string `json:"sid"`
			JobID string `json:"job_id"`
		} `json:"room"`
		Participant *struct {
			Identity string `json:"identity"`
			Sid      string `json:"sid"`
		} `json:"participant,omitempty"`
	}
	if err := json.Unmarshal(body, &event); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	// Log the event for analytics
	if h.store != nil {
		props := map[string]any{
			"room_name": event.Room.Name,
			"event":     event.Event,
		}
		if event.Participant != nil {
			props["participant_id"] = event.Participant.Identity
		}
		_ = h.store.CreateAnalyticsEvent(r.Context(), "", "livekit_room_event", props)
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) LiveKitToken(w http.ResponseWriter, r *http.Request) {
	if h.livekit == nil || !h.livekit.IsConfigured() {
		respondError(w, http.StatusServiceUnavailable, "livekit not configured")
		return
	}
	var req struct {
		Room       string `json:"room"`
		CanPublish bool   `json:"can_publish"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Room == "" {
		respondError(w, http.StatusBadRequest, "room required")
		return
	}
	userID := auth.UserIDFromContext(r.Context())
	token, err := h.livekit.CreateToken(req.Room, userID, req.CanPublish)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "token generation failed")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{
		"token": token,
		"url":   h.livekit.URL(),
	})
}
