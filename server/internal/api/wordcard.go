package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/game"
)

func generateGameID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (h *Handler) CreateWordCardGame(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	id := generateGameID()
	wcGame := game.NewWordCardGame(id, u.ID, "")
	wcGame.Status = "waiting"
	h.wordCardMgr.Add(wcGame)

	respondJSON(w, http.StatusOK, map[string]any{
		"game_id": id,
		"status":  "waiting",
		"state":   wcGame.PlayerView(u.ID),
	})
}

func (h *Handler) JoinWordCardGame(w http.ResponseWriter, r *http.Request) {
	gameID := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	wcGame, ok := h.wordCardMgr.Get(gameID)
	if !ok {
		respondError(w, http.StatusNotFound, "game not found")
		return
	}
	if wcGame.Status != "waiting" {
		respondError(w, http.StatusConflict, "game already started")
		return
	}
	if wcGame.PlayerA.UserID == u.ID {
		respondError(w, http.StatusConflict, "already in this game")
		return
	}

	wcGame.PlayerB.UserID = u.ID
	wcGame.CurrentTurn = wcGame.PlayerA.UserID
	wcGame.TurnStarted = time.Now().UTC()
	wcGame.Status = "playing"

	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("wordcard:"+gameID, map[string]any{
			"type":  "wordcard:game_started",
			"state": wcGame.PlayerView(wcGame.PlayerA.UserID),
		})
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"game_id": gameID,
		"status":  "playing",
		"state":   wcGame.PlayerView(u.ID),
	})
}

func (h *Handler) GetWordCardState(w http.ResponseWriter, r *http.Request) {
	gameID := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	wcGame, ok := h.wordCardMgr.Get(gameID)
	if !ok {
		respondError(w, http.StatusNotFound, "game not found")
		return
	}
	if wcGame.PlayerA.UserID != u.ID && wcGame.PlayerB.UserID != u.ID {
		respondError(w, http.StatusForbidden, "not your game")
		return
	}

	if wcGame.CheckTimeout() {
		if h.hub != nil {
			_ = h.hub.BroadcastToRoom("wordcard:"+gameID, map[string]any{
				"type":   "wordcard:timeout",
				"winner": *wcGame.WinnerID,
			})
		}
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"state": wcGame.PlayerView(u.ID),
	})
}

func (h *Handler) PlayWordCard(w http.ResponseWriter, r *http.Request) {
	gameID := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	var req struct {
		CardID string `json:"card_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}

	wcGame, ok := h.wordCardMgr.Get(gameID)
	if !ok {
		respondError(w, http.StatusNotFound, "game not found")
		return
	}
	if wcGame.PlayerA.UserID != u.ID && wcGame.PlayerB.UserID != u.ID {
		respondError(w, http.StatusForbidden, "not your game")
		return
	}

	if wcGame.CheckTimeout() {
		if h.hub != nil {
			_ = h.hub.BroadcastToRoom("wordcard:"+gameID, map[string]any{
				"type":   "wordcard:timeout",
				"winner": *wcGame.WinnerID,
				"state":  wcGame.PlayerView(u.ID),
			})
		}
		respondJSON(w, http.StatusOK, map[string]any{
			"result": "timeout",
			"state":  wcGame.PlayerView(u.ID),
		})
		return
	}

	result := wcGame.PlayCard(u.ID, req.CardID, time.Now().UTC())
	if !result.Valid {
		respondJSON(w, http.StatusBadRequest, map[string]any{
			"result":  "invalid",
			"message": result.ErrorMessage,
		})
		return
	}

	if h.hub != nil {
		opponentView := wcGame.PlayerView(wcGame.OpponentOf(u.ID).UserID)
		_ = h.hub.BroadcastToRoom("wordcard:"+gameID, map[string]any{
			"type":        "wordcard:card_played",
			"player_id":   u.ID,
			"card_word":   result.PlayedCard.Word,
			"new_center":  result.NewCenter,
			"points":      result.Points,
			"exact_match": result.ExactMatch,
			"streak":      result.Streak,
			"streak_bonus": result.StreakBonus,
			"round_over":  result.RoundOver,
			"game_over":   result.GameOver,
			"winner_id":   result.WinnerID,
			"state":       opponentView,
		})
	}

	resp := map[string]any{
		"result":      "played",
		"points":      result.Points,
		"exact_match": result.ExactMatch,
		"streak":      result.Streak,
		"streak_bonus": result.StreakBonus,
		"round_over":  result.RoundOver,
		"game_over":   result.GameOver,
		"winner_id":   result.WinnerID,
		"state":       wcGame.PlayerView(u.ID),
	}

	respondJSON(w, http.StatusOK, resp)
}

func (h *Handler) NextWordCardRound(w http.ResponseWriter, r *http.Request) {
	gameID := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	wcGame, ok := h.wordCardMgr.Get(gameID)
	if !ok {
		respondError(w, http.StatusNotFound, "game not found")
		return
	}
	if wcGame.PlayerA.UserID != u.ID && wcGame.PlayerB.UserID != u.ID {
		respondError(w, http.StatusForbidden, "not your game")
		return
	}

	if !wcGame.NextRound() {
		respondError(w, http.StatusConflict, "round not over")
		return
	}

	if h.hub != nil {
		_ = h.hub.BroadcastToRoom("wordcard:"+gameID, map[string]any{
			"type":  "wordcard:new_round",
			"round": wcGame.Round,
			"state": wcGame.PlayerView(wcGame.PlayerA.UserID),
		})
		_ = h.hub.BroadcastToRoom("wordcard:"+gameID, map[string]any{
			"type":  "wordcard:new_round",
			"round": wcGame.Round,
			"state": wcGame.PlayerView(wcGame.PlayerB.UserID),
		})
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"result": "next_round",
		"round":  wcGame.Round,
		"state":  wcGame.PlayerView(u.ID),
	})
}

func (h *Handler) RefillWordCard(w http.ResponseWriter, r *http.Request) {
	gameID := chi.URLParam(r, "id")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	wcGame, ok := h.wordCardMgr.Get(gameID)
	if !ok {
		respondError(w, http.StatusNotFound, "game not found")
		return
	}
	if wcGame.PlayerA.UserID != u.ID && wcGame.PlayerB.UserID != u.ID {
		respondError(w, http.StatusForbidden, "not your game")
		return
	}

	result := wcGame.RefillCard(u.ID)
	if !result.Success {
		respondJSON(w, http.StatusBadRequest, map[string]any{
			"result":  "error",
			"message": result.Error,
		})
		return
	}

	if h.hub != nil {
		opponentView := wcGame.PlayerView(wcGame.OpponentOf(u.ID).UserID)
		_ = h.hub.BroadcastToRoom("wordcard:"+gameID, map[string]any{
			"type":      "wordcard:refilled",
			"player_id": u.ID,
			"state":     opponentView,
		})
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"result": "refilled",
		"card":   result.Card,
		"state":  wcGame.PlayerView(u.ID),
	})
}

func (h *Handler) ListWordCardGames(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	games := make([]map[string]any, 0)
	for _, g := range h.wordCardMgr.All() {
		if g.PlayerA.UserID == u.ID || g.PlayerB.UserID == u.ID {
			games = append(games, g.PlayerView(u.ID))
		}
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"games": games,
	})
}
