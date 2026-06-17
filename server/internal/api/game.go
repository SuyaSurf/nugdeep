package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/cache"
	"games.bammby.com/server/internal/game"
	"games.bammby.com/server/internal/store"
)

func (h *Handler) StartGame(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PuzzleID  string `json:"puzzle_id"`
		Context   string `json:"context"`
		ContextID string `json:"context_id"`
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
	p, err := h.store.GetPuzzleByID(r.Context(), req.PuzzleID)
	if err != nil {
		respondError(w, http.StatusNotFound, "puzzle not found")
		return
	}
	ctxID := req.ContextID
	if ctxID == "" {
		ctxID = ""
	}
	sess := &store.GameSession{
		PuzzleID:  p.ID,
		UserID:    u.ID,
		Context:   req.Context,
		ContextID: &ctxID,
		StartedAt: time.Now().UTC(),
		Deadline:  time.Now().UTC().Add(time.Duration(p.TimerSeconds) * time.Second),
		Progress:  0,
		Result:    "in_progress",
	}
	sess, err = h.store.CreateGameSession(r.Context(), sess)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "session creation failed")
		return
	}
	g := game.NewSession(sess.ID, p.ID, u.ID, req.Context, sess.ContextID, p.WordSet, p.TimerSeconds)
	h.gameMgr.Add(g)
	word, _ := g.CurrentWord()
	cats := g.CategoriesForCurrent()
	respondJSON(w, http.StatusOK, map[string]any{
		"session_id": sess.ID,
		"deadline":   sess.Deadline,
		"word":       word.Word,
		"categories": cats,
		"target":     g.TargetCount,
		"progress":   g.Progress,
	})
}

func (h *Handler) GameAnswer(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionID string `json:"session_id"`
		Category  string `json:"category"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	s, ok := h.gameMgr.Get(req.SessionID)
	if !ok {
		respondError(w, http.StatusNotFound, "session not found")
		return
	}
	res, finished := s.Answer(req.Category)
	if res == game.AnswerExpired {
		_ = h.store.UpdateGameSessionStats(r.Context(), s.ID, "expired", s.Progress, s.WrongCount, s.LastCorrectAt)
		h.gameMgr.Remove(s.ID)
		if s.Context == "dating" && s.ContextID != nil {
			h.resolveDateMatch(r.Context(), *s.ContextID, s.UserID, s.Progress)
		}
		respondJSON(w, http.StatusOK, map[string]any{
			"result":   "expired",
			"progress": s.Progress,
		})
		return
	}
	// Broadcast progress to anyone watching this session room
	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("session:"+s.ID, map[string]any{
			"type":     "game_progress",
			"session":  s.ID,
			"user_id":  s.UserID,
			"result":   string(res),
			"progress": s.Progress,
		})
	}

	word, _ := s.CurrentWord()
	if finished {
		_ = h.store.UpdateGameSessionStats(r.Context(), s.ID, "won", s.Progress, s.WrongCount, s.LastCorrectAt)
		h.gameMgr.Remove(s.ID)
		// If community context, grant membership.
		if s.Context == "community" && s.ContextID != nil {
			_, _ = h.commSvc.UnlockByPuzzle(r.Context(), *s.ContextID, s.UserID)
		}
		// Update streak in cache for daily puzzles (Redis is authoritative)
		if s.Context == "daily" && h.cache != nil {
			_ = h.cache.Incr(r.Context(), cache.UserStreakKey(s.UserID))
			_ = h.cache.Expire(r.Context(), cache.UserStreakKey(s.UserID), 48*time.Hour)
			// Add to daily leaderboard
			_ = h.cache.LeaderboardAdd(r.Context(), cache.LeaderboardKey("daily", time.Now().UTC().Format("2006-01-02")), float64(s.Progress), s.UserID)
		}
		// Track analytics
		_ = h.store.CreateAnalyticsEvent(r.Context(), s.UserID, "puzzle_win", map[string]any{
			"puzzle_id": s.PuzzleID,
			"context":   s.Context,
			"progress":  s.Progress,
		})
		// Persist last_solve_at to DB for streak reset worker
		if u, err := h.store.GetUserByID(r.Context(), s.UserID); err == nil && u != nil {
			now := time.Now().UTC()
			u.LastSolveAt = &now
			_ = h.store.UpdateUser(r.Context(), u)
		}
		// Dating: check if opponent also finished and resolve winner
		if s.Context == "dating" && s.ContextID != nil {
			h.resolveDateMatch(r.Context(), *s.ContextID, s.UserID, s.Progress)
		}
		respondJSON(w, http.StatusOK, map[string]any{
			"result":   "won",
			"progress": s.Progress,
		})
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{
		"result":     string(res),
		"progress":   s.Progress,
		"word":       word.Word,
		"categories": s.CategoriesForCurrent(),
	})
}

func (h *Handler) resolveDateMatch(ctx context.Context, dateID, userID string, progress int) {
	if h.hub == nil {
		return
	}
	m, err := h.store.GetDateMatch(ctx, dateID)
	if err != nil || m.State != "playing" {
		return
	}

	oppID := m.PlayerA
	if oppID == userID {
		oppID = m.PlayerB
	}

	// Look up both sessions
	var mySess, oppSess *game.Session
	for _, s := range h.gameMgr.All() {
		if s.Context == "dating" && s.ContextID != nil && *s.ContextID == dateID {
			if s.UserID == userID {
				mySess = s
			} else if s.UserID == oppID {
				oppSess = s
			}
		}
	}
	if mySess == nil || oppSess == nil || oppSess.Result == game.ResultInProgress {
		_ = h.hub.BroadcastToRoom("date:"+m.ID, map[string]any{
			"type":     "date:progress",
			"user_id":  userID,
			"progress": progress,
		})
		return
	}

	// Tie-breaker: 1) higher progress 2) fewer wrong taps 3) earlier last_correct_at
	winnerID := userID
	if oppSess.Progress > mySess.Progress {
		winnerID = oppID
	} else if oppSess.Progress == mySess.Progress {
		if oppSess.WrongCount < mySess.WrongCount {
			winnerID = oppID
		} else if oppSess.WrongCount == mySess.WrongCount {
			if mySess.LastCorrectAt != nil && oppSess.LastCorrectAt != nil && oppSess.LastCorrectAt.Before(*mySess.LastCorrectAt) {
				winnerID = oppID
			}
		}
	}
	m.State = "decided"
	m.WinnerID = &winnerID
	expiry := time.Now().UTC().Add(120 * time.Second)
	m.RoomExpiresAt = &expiry
	_ = h.store.UpdateDateMatch(ctx, m)
	_ = h.hub.BroadcastToRoom("date:"+m.ID, map[string]any{
		"type":       "date:decided",
		"match_id":   m.ID,
		"winner_id":  winnerID,
		"expires_at": expiry,
	})
}
