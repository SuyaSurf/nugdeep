package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/audio"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/cache"
	"games.bammby.com/server/internal/community"
	"games.bammby.com/server/internal/game"
	"games.bammby.com/server/internal/livekit"
	"games.bammby.com/server/internal/lobby"
	"games.bammby.com/server/internal/matchmaking"
	"games.bammby.com/server/internal/moderation"
	"games.bammby.com/server/internal/push"
	"games.bammby.com/server/internal/store"
	"games.bammby.com/server/internal/ws"
)

// Handler holds all HTTP handlers.
type Handler struct {
	store       store.Repository
	commSvc     *community.Service
	gameMgr     *game.Manager
	wordCardMgr *game.WordCardManager
	match       *matchmaking.Service
	livekit     *livekit.Service
	mod         *moderation.Service
	push        *push.Service
	audioSvc    *audio.Service
	cache       *cache.Cache
	hub         *ws.Hub
	lobbySvc    *lobby.Service
	lobbyH      *lobby.Handler
}

func NewHandler(s store.Repository, lk *livekit.Service, c *cache.Cache, hub *ws.Hub) *Handler {
	lobbySvc := lobby.NewService(c)
	return &Handler{
		store:       s,
		commSvc:     community.NewService(s),
		gameMgr:     game.NewManager(),
		wordCardMgr: game.NewWordCardManager(),
		match:       matchmaking.NewService(c, s, hub),
		livekit:     lk,
		mod:         moderation.NewService(),
		push:        push.NewService(c),
		audioSvc:    audio.NewService(c),
		cache:       c,
		hub:         hub,
		lobbySvc:    lobbySvc,
		lobbyH:      lobby.NewHandler(lobbySvc, hub),
	}
}

// StartGameCleanup delegates to the game manager's background cleanup.
func (h *Handler) StartGameCleanup(interval time.Duration) {
	h.gameMgr.StartCleanup(interval)
}

// StartWordCardCleanup cleans up finished word card games.
func (h *Handler) StartWordCardCleanup(interval time.Duration) {
	h.wordCardMgr.StartCleanup(interval)
}

// StartLobbyCleanup runs a background worker that removes stale lobby queue entries.
func (h *Handler) StartLobbyCleanup(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			h.lobbySvc.CleanupStaleEntries(context.Background())
		}
	}()
}

// StartMatchExpiry delegates to the matchmaking service's expiry worker.
func (h *Handler) StartMatchExpiry(interval time.Duration) {
	h.match.StartExpiryWorker(interval)
}

// StartSpaceExpiry runs a background worker that closes expired 24h spaces.
func (h *Handler) StartSpaceExpiry(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			_, _ = h.store.CloseExpiredSpaces(ctx)
			cancel()
		}
	}()
}

// StartShadowBanWorker checks for users with >=3 reports in 7 days and bans them for 24h.
func (h *Handler) StartShadowBanWorker(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			_, _ = h.store.AutoShadowBan(ctx, 3, 7*24*time.Hour)
			cancel()
		}
	}()
}

// StartInactivePurgeWorker hard-deletes users inactive for >12 months (GDPR).
func (h *Handler) StartInactivePurgeWorker(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			before := time.Now().UTC().AddDate(-1, 0, 0)
			_, _ = h.store.PurgeInactiveUsers(ctx, before)
			cancel()
		}
	}()
}

// StartStreakResetWorker resets streaks for users who haven't solved a daily puzzle
// in more than 24 hours. Runs every hour.
func (h *Handler) StartStreakResetWorker(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			cutoff := time.Now().UTC().Add(-25 * time.Hour)
			_, _ = h.store.ResetStreaksForInactiveUsers(ctx, cutoff)
			cancel()
		}
	}()
}

// StartDateFlipWorker flips decided matches after their 120s room_expires_at passes,
// broadcasting date:flip so the loser can take the lead.
func (h *Handler) StartDateFlipWorker(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			_, _ = h.store.FlipDecidedMatches(ctx)
			flipped, err := h.store.ListFlippedMatches(ctx, 100)
			cancel()
			if err != nil || h.hub == nil {
				continue
			}
			for _, m := range flipped {
				_ = h.hub.BroadcastToRoom("date:"+m.ID, map[string]any{
					"type":     "date:flip",
					"match_id": m.ID,
				})
			}
		}
	}()
}

// Routes mounts all routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/health", h.Health)

	r.Route("/api/v1", func(r chi.Router) {
		// Public
		r.Get("/categories", h.ListCategories)
		r.Get("/communities/{slug}/preview", h.CommunityPreview)
		r.Get("/profiles/{username}", h.GetPublicProfile)
		r.Get("/spotlight", h.Spotlight)
		r.Get("/discover", h.Discover)

		// Authenticated
		// Public lobby activity — static data, no auth needed
		r.Get("/lobby/activity", h.lobbyH.GetTodaysActivity)

		r.Group(func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Use(h.EnsureUser)
			r.Post("/puzzles", h.CreatePuzzle)
			r.Get("/puzzles/{id}/meta", h.GetPuzzleMeta)
			r.Post("/communities", h.CreateCommunity)
			r.Get("/communities/{slug}", h.GetCommunity)
			r.Post("/communities/{slug}/codes", h.MintCode)
			r.Post("/codes/{code}/redeem", h.RedeemCode)
			r.Get("/communities/{slug}/members", h.ListMembers)
			r.Delete("/communities/{slug}/members/{userID}", h.RemoveMember)
			r.Patch("/communities/{slug}/members/{userID}/role", h.UpdateMemberRole)
			r.Post("/game/start", h.StartGame)
			r.Post("/game/answer", h.GameAnswer)
			r.Get("/me", h.GetMe)
			r.Patch("/me", h.UpdateProfile)
			r.Post("/messages", h.PostMessage)
			r.Get("/messages/{scope}/{scopeID}", h.ListMessages)
			r.Post("/livekit/token", h.LiveKitToken)
			r.Post("/livekit/webhook", h.LiveKitWebhook)
			r.Get("/me/export", h.ExportUserData)
			r.Delete("/me", h.DeleteAccount)
			r.Post("/spaces", h.CreateSpace)
			r.Get("/spaces/{id}", h.GetSpace)
			r.Get("/communities/{communityID}/spaces", h.ListCommunitySpaces)
			r.Post("/spaces/{id}/close", h.CloseSpace)
			r.Patch("/spaces/{id}/speaking", h.ToggleSpeaking)
			r.Post("/spaces/{id}/rounds", h.OpenSpeakerRound)
			r.Post("/spaces/{id}/rounds/end", h.EndSpeakerTurn)
			r.Post("/spaces/{id}/request-speak", h.RequestToSpeak)
			r.Get("/spaces/{id}/speakers", h.GetSpaceSpeakers)
			r.Post("/spaces/{id}/voice-token", h.SpaceVoiceToken)
			r.Post("/spaces/{id}/kick", h.KickSpeaker)
			r.Post("/spaces/{id}/mute", h.MuteSpeaker)
			r.Post("/dates/{id}/voice-token", h.DateVoiceToken)
			r.Post("/lobby/{matchId}/voice-token", h.DateVoiceToken)
			r.Get("/daily", h.Daily)
			r.Get("/streak", h.Streak)
			r.Get("/bragging-card", h.BraggingCard)
			r.Get("/bragging-card.png", h.BraggingCardPNG)
			r.Get("/leaderboard/{scope}/{scopeID}", h.Leaderboard)
			r.Post("/wordcard/create", h.CreateWordCardGame)
			r.Post("/wordcard/{id}/join", h.JoinWordCardGame)
			r.Post("/wordcard/{id}/play", h.PlayWordCard)
			r.Post("/wordcard/{id}/refill", h.RefillWordCard)
			r.Post("/wordcard/{id}/next-round", h.NextWordCardRound)
			r.Get("/wordcard/{id}/state", h.GetWordCardState)
			r.Get("/wordcard/games", h.ListWordCardGames)

			r.Post("/dates/queue", h.JoinDateQueue)
			r.Delete("/dates/queue", h.LeaveDateQueue)
			r.Post("/dates/{id}/start", h.StartDateGame)
			r.Post("/dates/{id}/message", h.PostDateMessage)
			r.Get("/dates/{id}/preview", h.GetDatePreview)
			r.Post("/dates/{id}/accept", h.AcceptDate)
			r.Post("/dates/{id}/decline", h.DeclineDate)
			r.Post("/dates/{id}/rematch", h.RematchDate)
			r.Get("/dates", h.ListMyDates)
			r.Post("/referrals", h.CreateReferralCode)
			r.Post("/referrals/redeem", h.RedeemReferralCode)
			r.Get("/referrals/stats", h.ReferralStats)
			r.Get("/moderation/queue", h.ModerationQueue)
			r.Post("/reports", h.ReportUser)
			r.Post("/blocks", h.BlockUser)
			r.Post("/push/token", h.RegisterPushToken)

			h.lobbyH.Routes(r)
		})
	})
}

func respondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, map[string]string{"error": msg})
}
