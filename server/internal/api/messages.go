package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/store"
)

func (h *Handler) ListMessages(w http.ResponseWriter, r *http.Request) {
	scope := chi.URLParam(r, "scope")
	scopeID := chi.URLParam(r, "scopeID")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 50
	}
	msgs, err := h.store.ListMessages(r.Context(), scope, scopeID, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "db error")
		return
	}
	respondJSON(w, http.StatusOK, msgs)
}

func (h *Handler) PostMessage(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Scope   string `json:"scope"`
		ScopeID string `json:"scope_id"`
		Body    string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Scope == "" || req.ScopeID == "" || req.Body == "" {
		respondError(w, http.StatusBadRequest, "scope, scope_id and body required")
		return
	}
	if len(req.Body) > 2000 {
		respondError(w, http.StatusBadRequest, "message too long (max 2000)")
		return
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	status := "ok"
	if h.mod != nil {
		result, err := h.mod.Check(req.Body)
		if err != nil {
			respondError(w, http.StatusBadGateway, "moderation failed")
			return
		}
		if result.Flagged {
			status = "held"
		}
	}
	m := &store.Message{
		Scope:            req.Scope,
		ScopeID:          req.ScopeID,
		UserID:           u.ID,
		Body:             req.Body,
		ModerationStatus: status,
	}
	m, err = h.store.CreateMessage(r.Context(), m)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "create failed")
		return
	}
	if status == "ok" && h.hub != nil {
		_ = h.hub.BroadcastToRoom(req.Scope+":"+req.ScopeID, map[string]any{
			"type":    "chat:new",
			"payload": m,
		})
	}
	respondJSON(w, http.StatusCreated, m)
}

func (h *Handler) ModerationQueue(w http.ResponseWriter, r *http.Request) {
	limit := 100
	msgs, err := h.store.ListHeldMessages(r.Context(), limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "db error")
		return
	}
	respondJSON(w, http.StatusOK, msgs)
}
