package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/game"
	"games.bammby.com/server/internal/store"
)

func (h *Handler) JoinDateQueue(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Categories []string `json:"categories"`
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
	if !u.DatingEligible {
		respondError(w, http.StatusForbidden, "complete profile before joining dating queue")
		return
	}
	// Age gate: must be 18+ for dating (check first two chars of age_bucket)
	if u.AgeBucket != "" {
		var minAge int
		if _, err := fmt.Sscanf(u.AgeBucket, "%d", &minAge); err == nil && minAge < 18 {
			respondError(w, http.StatusForbidden, "must be 18 or older")
			return
		}
	}
	// Email or phone must be verified before first match
	if !u.EmailVerified && !u.PhoneVerified {
		respondError(w, http.StatusForbidden, "verify email or phone before dating")
		return
	}
	if u.ShadowBannedUntil != nil && u.ShadowBannedUntil.After(time.Now().UTC()) {
		respondError(w, http.StatusForbidden, "matchmaking temporarily unavailable")
		return
	}
	// Daily limit: 3 matches per day
	dailyCount, err := h.store.CountDailyMatches(r.Context(), u.ID, time.Now().UTC().Truncate(24*time.Hour))
	if err == nil && dailyCount >= 3 {
		respondError(w, http.StatusTooManyRequests, "daily match limit reached")
		return
	}
	result, err := h.match.Join(r.Context(), u, req.Categories)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, result)
}

func (h *Handler) LeaveDateQueue(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Categories []string `json:"categories"`
	}
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if err := h.match.Leave(r.Context(), u.ID, req.Categories); err != nil {
		respondError(w, http.StatusInternalServerError, "leave queue failed")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "left"})
}

func (h *Handler) StartDateGame(w http.ResponseWriter, r *http.Request) {
	dateID := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	m, err := h.store.GetDateMatch(r.Context(), dateID)
	if err != nil {
		respondError(w, http.StatusNotFound, "match not found")
		return
	}
	if m.PlayerA != u.ID && m.PlayerB != u.ID {
		respondError(w, http.StatusForbidden, "not your match")
		return
	}

	// If already playing, return this player's existing session
	if m.State == "playing" && m.PuzzleID != nil {
		mySess := h.findDatingSession(m.ID, u.ID)
		if mySess != nil {
			word, _ := mySess.CurrentWord()
			respondJSON(w, http.StatusOK, map[string]any{
				"session_id": mySess.ID,
				"deadline":   mySess.Deadline,
				"word":       word.Word,
				"categories": mySess.CategoriesForCurrent(),
				"target":     mySess.TargetCount,
				"progress":   mySess.Progress,
			})
			return
		}
		respondError(w, http.StatusConflict, "match already started")
		return
	}
	if m.State != "matched" {
		respondError(w, http.StatusConflict, "match not available")
		return
	}

	// Atomic check: re-fetch match to prevent race on concurrent StartDateGame calls
	m, err = h.store.GetDateMatch(r.Context(), dateID)
	if err != nil || m.State != "matched" {
		respondError(w, http.StatusConflict, "match already started")
		return
	}

	puzzle, err := h.store.GetDailyPuzzle(r.Context(), time.Now().UTC())
	if err != nil || puzzle == nil {
		respondError(w, http.StatusServiceUnavailable, "no puzzle available")
		return
	}

	// Create game sessions for both players
	playerIDs := []string{m.PlayerA, m.PlayerB}
	sessions := make(map[string]*game.Session)
	for _, pid := range playerIDs {
		sess := &store.GameSession{
			PuzzleID:  puzzle.ID,
			UserID:    pid,
			Context:   "dating",
			ContextID: &m.ID,
			StartedAt: time.Now().UTC(),
			Deadline:  time.Now().UTC().Add(time.Duration(puzzle.TimerSeconds) * time.Second),
			Progress:  0,
			Result:    "in_progress",
		}
		sess, err = h.store.CreateGameSession(r.Context(), sess)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "session creation failed")
			return
		}
		g := game.NewSession(sess.ID, puzzle.ID, pid, "dating", &m.ID, puzzle.WordSet, puzzle.TimerSeconds)
		h.gameMgr.Add(g)
		sessions[pid] = g
	}

	m.PuzzleID = &puzzle.ID
	m.State = "playing"
	if err := h.store.UpdateDateMatch(r.Context(), m); err != nil {
		respondError(w, http.StatusInternalServerError, "update match failed")
		return
	}

	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("date:"+m.ID, map[string]any{
			"type":      "date:game_started",
			"match_id":  m.ID,
			"puzzle_id": puzzle.ID,
			"deadline":  sessions[m.PlayerA].Deadline,
			"target":    len(puzzle.WordSet),
		})
	}

	mySess := sessions[u.ID]
	word, _ := mySess.CurrentWord()
	respondJSON(w, http.StatusOK, map[string]any{
		"session_id": mySess.ID,
		"deadline":   mySess.Deadline,
		"word":       word.Word,
		"categories": mySess.CategoriesForCurrent(),
		"target":     mySess.TargetCount,
		"progress":   mySess.Progress,
	})
}

func (h *Handler) findDatingSession(dateID, userID string) *game.Session {
	for _, s := range h.gameMgr.All() {
		if s.Context == "dating" && s.ContextID != nil && *s.ContextID == dateID && s.UserID == userID {
			return s
		}
	}
	return nil
}

func (h *Handler) PostDateMessage(w http.ResponseWriter, r *http.Request) {
	dateID := chi.URLParam(r, "id")
	var req struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Body == "" {
		respondError(w, http.StatusBadRequest, "body required")
		return
	}

	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	m, err := h.store.GetDateMatch(r.Context(), dateID)
	if err != nil {
		respondError(w, http.StatusNotFound, "match not found")
		return
	}
	if m.PlayerA != u.ID && m.PlayerB != u.ID {
		respondError(w, http.StatusForbidden, "not your match")
		return
	}
	if m.State != "decided" && m.State != "messaged" {
		respondError(w, http.StatusConflict, "match not ready for messages")
		return
	}

	// Winner-first: only winner can send first message within 120s of decision
	if m.State == "decided" {
		if m.WinnerID == nil || *m.WinnerID != u.ID {
			respondError(w, http.StatusForbidden, "winner sends first message")
			return
		}
		if m.RoomExpiresAt != nil && time.Now().UTC().After(*m.RoomExpiresAt) {
			// Flip: either player can message
		} else if m.RoomExpiresAt == nil {
			respondError(w, http.StatusInternalServerError, "room expiry not set")
			return
		}
	}

	// 300 char limit per plan §1.4
	if len(req.Body) > 300 {
		respondError(w, http.StatusBadRequest, "message too long (max 300)")
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

	msg := &store.Message{
		Scope:            "date",
		ScopeID:          m.ID,
		UserID:           u.ID,
		Body:             req.Body,
		ModerationStatus: status,
	}
	msg, err = h.store.CreateMessage(r.Context(), msg)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "create failed")
		return
	}
	if msg.ModerationStatus == "held" {
		respondJSON(w, http.StatusOK, map[string]string{"status": "blocked", "reason": "message flagged by moderation"})
		return
	}

	// Update match state and first_message
	m.State = "messaged"
	m.FirstMessage = &req.Body
	if err := h.store.UpdateDateMatch(r.Context(), m); err != nil {
		respondError(w, http.StatusInternalServerError, "update match failed")
		return
	}

	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("date:"+m.ID, map[string]any{
			"type":    "date:message",
			"payload": msg,
		})
	}
	respondJSON(w, http.StatusCreated, msg)
}

func (h *Handler) ListMyDates(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	limit := 20
	matches, err := h.store.ListDateMatchesByPlayer(r.Context(), u.ID, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "db error")
		return
	}
	respondJSON(w, http.StatusOK, matches)
}

func (h *Handler) GetDatePreview(w http.ResponseWriter, r *http.Request) {
	dateID := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	m, err := h.store.GetDateMatch(r.Context(), dateID)
	if err != nil {
		respondError(w, http.StatusNotFound, "match not found")
		return
	}
	if m.PlayerA != u.ID && m.PlayerB != u.ID {
		respondError(w, http.StatusForbidden, "not your match")
		return
	}

	oppID := m.PlayerA
	if oppID == u.ID {
		oppID = m.PlayerB
	}
	opp, err := h.store.GetUserByID(r.Context(), oppID)
	if err != nil {
		respondError(w, http.StatusNotFound, "opponent not found")
		return
	}

	// Shared categories
	shared := []string{}
	seen := map[string]bool{}
	for _, c := range u.Categories {
		seen[c] = true
	}
	for _, c := range opp.Categories {
		if seen[c] {
			shared = append(shared, c)
		}
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"opponent": map[string]any{
			"username":        opp.Username,
			"age_bucket":      opp.AgeBucket,
			"gender_identity": opp.GenderIdentity,
			"location_label":  opp.LocationLabel,
			"bio":             opp.Bio,
			"categories":      opp.Categories,
		},
		"shared_categories": shared,
	})
}

func (h *Handler) AcceptDate(w http.ResponseWriter, r *http.Request) {
	dateID := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	m, err := h.store.GetDateMatch(r.Context(), dateID)
	if err != nil {
		respondError(w, http.StatusNotFound, "match not found")
		return
	}
	if m.PlayerA != u.ID && m.PlayerB != u.ID {
		respondError(w, http.StatusForbidden, "not your match")
		return
	}
	if m.State != "messaged" {
		respondError(w, http.StatusConflict, "match not ready")
		return
	}
	m.State = "accepted"
	roomExpiry := time.Now().UTC().Add(24 * time.Hour)
	m.RoomExpiresAt = &roomExpiry
	if err := h.store.UpdateDateMatch(r.Context(), m); err != nil {
		respondError(w, http.StatusInternalServerError, "update failed")
		return
	}
	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("date:"+m.ID, map[string]any{
			"type":       "date:accepted",
			"match_id":   m.ID,
			"expires_at": roomExpiry,
		})
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "accepted"})
}

func (h *Handler) DeclineDate(w http.ResponseWriter, r *http.Request) {
	dateID := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	m, err := h.store.GetDateMatch(r.Context(), dateID)
	if err != nil {
		respondError(w, http.StatusNotFound, "match not found")
		return
	}
	if m.PlayerA != u.ID && m.PlayerB != u.ID {
		respondError(w, http.StatusForbidden, "not your match")
		return
	}
	m.State = "declined"
	if err := h.store.UpdateDateMatch(r.Context(), m); err != nil {
		respondError(w, http.StatusInternalServerError, "update failed")
		return
	}
	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("date:"+m.ID, map[string]any{
			"type":     "date:declined",
			"match_id": m.ID,
		})
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "declined"})
}

func (h *Handler) DateVoiceToken(w http.ResponseWriter, r *http.Request) {
	dateID := chi.URLParam(r, "id")
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
	m, err := h.store.GetDateMatch(r.Context(), dateID)
	if err != nil {
		respondError(w, http.StatusNotFound, "match not found")
		return
	}
	if m.PlayerA != u.ID && m.PlayerB != u.ID {
		respondError(w, http.StatusForbidden, "not your match")
		return
	}
	if m.State != "accepted" {
		respondError(w, http.StatusConflict, "match not accepted")
		return
	}
	if m.RoomExpiresAt != nil && time.Now().UTC().After(*m.RoomExpiresAt) {
		respondError(w, http.StatusForbidden, "room expired")
		return
	}
	room := "date-" + m.ID
	token, err := h.livekit.CreateToken(room, u.ID, true)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "token failed")
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"url":   h.livekit.URL(),
		"room":  room,
	})
}

func (h *Handler) RematchDate(w http.ResponseWriter, r *http.Request) {
	dateID := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	m, err := h.store.GetDateMatch(r.Context(), dateID)
	if err != nil {
		respondError(w, http.StatusNotFound, "match not found")
		return
	}
	if m.PlayerA != u.ID && m.PlayerB != u.ID {
		respondError(w, http.StatusForbidden, "not your match")
		return
	}
	// Rematch creates a new date match with same players, resets to matched
	rematch, err := h.store.CreateDateMatch(r.Context(), &store.DateMatch{
		PlayerA: m.PlayerA,
		PlayerB: m.PlayerB,
		State:   "matched",
	})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "rematch creation failed")
		return
	}
	if h.hub != nil {
		payload := map[string]any{
			"type":  "date:rematched",
			"match": rematch,
			"room":  "date:" + rematch.ID,
		}
		_ = h.hub.BroadcastToRoom("user:"+m.PlayerA, payload)
		_ = h.hub.BroadcastToRoom("user:"+m.PlayerB, payload)
	}
	respondJSON(w, http.StatusOK, rematch)
}
