package lobby

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/ws"
)

type Handler struct {
	svc *Service
	hub *ws.Hub
}

func NewHandler(svc *Service, hub *ws.Hub) *Handler {
	return &Handler{svc: svc, hub: hub}
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
	userID := auth.UserIDFromContext(r.Context())
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
		opponentA := match.PlayerB
		if opponentA == userID {
			opponentA = match.PlayerA
		}

		h.hub.BroadcastToRoom("user:"+match.PlayerA, map[string]interface{}{
			"type": "lobby:matched",
			"payload": map[string]interface{}{
				"match_id": match.ID,
				"opponent": match.PlayerB,
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
	userID := auth.UserIDFromContext(r.Context())
	h.svc.LeaveQueue(r.Context(), userID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "left"})
}

func (h *Handler) PickLocations(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
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

	match, _ := h.svc.GetMatch(r.Context(), matchID)
	winnerSees := RandomLocations(3)

	h.hub.BroadcastToRoom("user:"+*match.WinnerID, map[string]interface{}{
		"type": "lobby:location_picked",
		"payload": map[string]interface{}{
			"match_id":  matchID,
			"locations": winnerSees,
		},
	})

	writeJSON(w, http.StatusOK, map[string]string{"status": "picked"})
}

func (h *Handler) ChooseLocation(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
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
	userID := auth.UserIDFromContext(r.Context())
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
