package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/audio"
	"games.bammby.com/server/internal/auth"
)

func (h *Handler) CreateAudioRoom(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name  string `json:"name"`
		Topic string `json:"topic"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "name required")
		return
	}

	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	room := &audio.Room{
		ID:     generateID(),
		Name:   req.Name,
		HostID: u.ID,
		Topic:  req.Topic,
	}
	if err := h.audioSvc.CreateRoom(r.Context(), room); err != nil {
		respondError(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, room)
}

func (h *Handler) ListAudioRooms(w http.ResponseWriter, r *http.Request) {
	rooms, err := h.audioSvc.ListRooms(r.Context())
	if err != nil {
		respondError(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, rooms)
}

func (h *Handler) JoinAudioRoom(w http.ResponseWriter, r *http.Request) {
	roomID := chi.URLParam(r, "id")
	if roomID == "" {
		respondError(w, http.StatusBadRequest, "room id required")
		return
	}

	room, err := h.audioSvc.GetRoom(r.Context(), roomID)
	if err != nil {
		respondError(w, http.StatusNotFound, "room not found")
		return
	}

	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	if h.livekit == nil || !h.livekit.IsConfigured() {
		respondError(w, http.StatusServiceUnavailable, "livekit not configured")
		return
	}

	token, err := h.livekit.CreateToken(roomID, u.ID, true)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "token generation failed")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"token":     token,
		"url":       h.livekit.URL(),
		"room_id":   room.ID,
		"room_name": room.Name,
	})
}

func (h *Handler) DeleteAudioRoom(w http.ResponseWriter, r *http.Request) {
	roomID := chi.URLParam(r, "id")
	if roomID == "" {
		respondError(w, http.StatusBadRequest, "room id required")
		return
	}

	room, err := h.audioSvc.GetRoom(r.Context(), roomID)
	if err != nil {
		respondError(w, http.StatusNotFound, "room not found")
		return
	}

	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if room.HostID != u.ID {
		respondError(w, http.StatusForbidden, "only host can delete")
		return
	}

	if err := h.audioSvc.DeleteRoom(r.Context(), roomID); err != nil {
		respondError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// generateID creates a simple timestamp-based ID.
func generateID() string {
	return "room_" + time.Now().UTC().Format("20060102150405") + "_" + randomString(6)
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}
