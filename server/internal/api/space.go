package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/store"
)

func (h *Handler) CreateSpace(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CommunityID string `json:"community_id"`
		Name        string `json:"name"`
		Topic       string `json:"topic"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.CommunityID == "" || req.Name == "" {
		respondError(w, http.StatusBadRequest, "community_id and name required")
		return
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	// Verify membership
	mem, err := h.store.GetMembership(r.Context(), req.CommunityID, u.ID)
	if err != nil || mem == nil {
		respondError(w, http.StatusForbidden, "not a member")
		return
	}
	sp := &store.Space{
		CommunityID:     req.CommunityID,
		CreatorID:       u.ID,
		Name:            req.Name,
		Topic:           req.Topic,
		State:           "open",
		SpeakingEnabled: true,
		OpensAt:         time.Now().UTC(),
		ClosesAt:        time.Now().UTC().Add(24 * time.Hour),
	}
	sp, err = h.store.CreateSpace(r.Context(), sp)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "create failed")
		return
	}
	respondJSON(w, http.StatusCreated, sp)
}

func (h *Handler) GetSpace(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	sp, err := h.store.GetSpace(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "space not found")
		return
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	mem, _ := h.store.GetMembership(r.Context(), sp.CommunityID, u.ID)
	if mem == nil {
		respondError(w, http.StatusForbidden, "not a community member")
		return
	}
	respondJSON(w, http.StatusOK, sp)
}

func (h *Handler) ListCommunitySpaces(w http.ResponseWriter, r *http.Request) {
	communityID := chi.URLParam(r, "communityID")
	spaces, err := h.store.ListSpacesByCommunity(r.Context(), communityID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "db error")
		return
	}
	respondJSON(w, http.StatusOK, spaces)
}

func (h *Handler) CloseSpace(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	sp, err := h.store.GetSpace(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "space not found")
		return
	}
	if sp.CreatorID != u.ID {
		respondError(w, http.StatusForbidden, "only creator can close")
		return
	}
	sp.State = "closed"
	if err := h.store.UpdateSpace(r.Context(), sp); err != nil {
		respondError(w, http.StatusInternalServerError, "update failed")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "closed"})
}

func (h *Handler) ToggleSpeaking(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	sp, err := h.store.GetSpace(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "space not found")
		return
	}
	if sp.CreatorID != u.ID {
		respondError(w, http.StatusForbidden, "only creator can toggle")
		return
	}
	sp.SpeakingEnabled = !sp.SpeakingEnabled
	if err := h.store.UpdateSpace(r.Context(), sp); err != nil {
		respondError(w, http.StatusInternalServerError, "update failed")
		return
	}
	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("space:"+sp.ID, map[string]any{
			"type":             "space:speaking_toggled",
			"speaking_enabled": sp.SpeakingEnabled,
		})
	}
	respondJSON(w, http.StatusOK, sp)
}

func (h *Handler) OpenSpeakerRound(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	sp, err := h.store.GetSpace(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "space not found")
		return
	}
	if sp.CreatorID != u.ID {
		respondError(w, http.StatusForbidden, "only creator can open rounds")
		return
	}
	if !sp.SpeakingEnabled {
		respondError(w, http.StatusConflict, "speaking disabled")
		return
	}
	// Close previous round if open
	prev, _ := h.store.GetOpenRoundBySpace(r.Context(), sp.ID)
	if prev != nil {
		_ = h.store.CloseSpeakerRound(r.Context(), prev.ID)
	}
	// Count rounds to set round_no
	prevCount, _ := h.store.CountSpeakerRoundsBySpace(r.Context(), sp.ID)
	sr := &store.SpeakerRound{
		SpaceID:  sp.ID,
		RoundNo:  prevCount + 1,
		OpenedAt: time.Now().UTC(),
	}
	sr, err = h.store.CreateSpeakerRound(r.Context(), sr)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "create round failed")
		return
	}
	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("space:"+sp.ID, map[string]any{
			"type":     "space:round_open",
			"round_id": sr.ID,
			"round_no": sr.RoundNo,
		})
	}
	respondJSON(w, http.StatusOK, sr)
}

func (h *Handler) RequestToSpeak(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	sp, err := h.store.GetSpace(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "space not found")
		return
	}
	if sp.State != "open" {
		respondError(w, http.StatusConflict, "space closed")
		return
	}
	if !sp.SpeakingEnabled {
		respondError(w, http.StatusConflict, "speaking disabled")
		return
	}
	round, err := h.store.GetOpenRoundBySpace(r.Context(), sp.ID)
	if err != nil {
		respondError(w, http.StatusConflict, "no open round")
		return
	}
	req := &store.SpeakRequest{
		RoundID:     round.ID,
		UserID:      u.ID,
		RequestedAt: time.Now().UTC(),
		Approved:    false,
	}
	req, err = h.store.CreateSpeakRequest(r.Context(), req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "request failed")
		return
	}
	// Atomically auto-approve first 3 if under 4-speaker cap (creator holds one slot)
	approved, _ := h.store.ApproveEarliestRequestIfUnderCap(r.Context(), round.ID, 3)
	if h.hub != nil {
		payload := map[string]any{
			"type":       "space:request_ack",
			"user_id":    u.ID,
			"request_id": req.ID,
			"approved":   approved,
		}
		_ = h.hub.BroadcastToRoom("space:"+sp.ID, payload)
	}
	respondJSON(w, http.StatusOK, req)
}

func (h *Handler) GetSpaceSpeakers(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	round, err := h.store.GetOpenRoundBySpace(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "no open round")
		return
	}
	requests, err := h.store.ListSpeakRequests(r.Context(), round.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "db error")
		return
	}
	respondJSON(w, http.StatusOK, requests)
}

func (h *Handler) SpaceVoiceToken(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if h.livekit == nil || !h.livekit.IsConfigured() {
		respondError(w, http.StatusServiceUnavailable, "livekit not configured")
		return
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	sp, err := h.store.GetSpace(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "space not found")
		return
	}
	if sp.State != "open" {
		respondError(w, http.StatusConflict, "space closed")
		return
	}
	// Verify community membership
	mem, err := h.store.GetMembership(r.Context(), sp.CommunityID, u.ID)
	if err != nil || mem == nil {
		respondError(w, http.StatusForbidden, "not a community member")
		return
	}

	// Creator always can publish; approved speakers can publish if speaking enabled
	canPublish := sp.CreatorID == u.ID
	if !canPublish && sp.SpeakingEnabled {
		round, err := h.store.GetOpenRoundBySpace(r.Context(), sp.ID)
		if err == nil {
			requests, _ := h.store.ListSpeakRequests(r.Context(), round.ID)
			for _, req := range requests {
				if req.UserID == u.ID && req.Approved {
					canPublish = true
					break
				}
			}
		}
	}

	room := sp.LivekitRoom
	if room == "" {
		room = "space-" + sp.ID
	}
	token, err := h.livekit.CreateToken(room, u.ID, canPublish)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "token failed")
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{
		"token":       token,
		"url":         h.livekit.URL(),
		"can_publish": canPublish,
		"room":        room,
	})
}

func (h *Handler) EndSpeakerTurn(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	sp, err := h.store.GetSpace(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "space not found")
		return
	}
	if sp.CreatorID != u.ID {
		respondError(w, http.StatusForbidden, "only creator can end turns")
		return
	}
	round, err := h.store.GetOpenRoundBySpace(r.Context(), sp.ID)
	if err != nil {
		respondError(w, http.StatusNotFound, "no open round")
		return
	}
	if err := h.store.CloseSpeakerRound(r.Context(), round.ID); err != nil {
		respondError(w, http.StatusInternalServerError, "close failed")
		return
	}
	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("space:"+sp.ID, map[string]any{
			"type":     "space:turn_ended",
			"space_id": sp.ID,
			"round_id": round.ID,
		})
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "turn ended"})
}

func (h *Handler) KickSpeaker(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		UserID string `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	sp, err := h.store.GetSpace(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "space not found")
		return
	}
	if sp.CreatorID != u.ID {
		respondError(w, http.StatusForbidden, "only creator can kick")
		return
	}
	round, err := h.store.GetOpenRoundBySpace(r.Context(), sp.ID)
	if err == nil && round != nil {
		_ = h.store.RevokeSpeakerApproval(r.Context(), round.ID, req.UserID)
	}
	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("space:"+sp.ID, map[string]any{
			"type":     "space:kicked",
			"user_id":  req.UserID,
			"space_id": sp.ID,
		})
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "kicked"})
}

func (h *Handler) MuteSpeaker(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		UserID string `json:"user_id"`
		Muted  bool   `json:"muted"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	sp, err := h.store.GetSpace(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "space not found")
		return
	}
	if sp.CreatorID != u.ID {
		respondError(w, http.StatusForbidden, "only creator can mute")
		return
	}
	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("space:"+sp.ID, map[string]any{
			"type":     "space:muted",
			"user_id":  req.UserID,
			"muted":    req.Muted,
			"space_id": sp.ID,
		})
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "muted"})
}
