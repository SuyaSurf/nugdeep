package api

import (
	"encoding/json"
	"net/http"
	"time"

	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/referral"
)

// CreateReferralCode generates a new referral code for the authenticated user.
func (h *Handler) CreateReferralCode(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	code := referral.GenerateCode(u.ID)
	if h.cache != nil {
		_ = h.cache.SetString(r.Context(), referral.Key(code), u.ID, 30*24*time.Hour)
	}
	respondJSON(w, http.StatusOK, map[string]string{"code": code})
}

// RedeemReferralCode applies a referral code to the authenticated user.
func (h *Handler) RedeemReferralCode(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Code == "" {
		respondError(w, http.StatusBadRequest, "code required")
		return
	}

	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	if h.cache == nil {
		respondError(w, http.StatusServiceUnavailable, "referral system unavailable")
		return
	}

	inviterID, err := h.cache.GetString(r.Context(), referral.Key(req.Code))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid or expired code")
		return
	}
	if inviterID == u.ID {
		respondError(w, http.StatusBadRequest, "cannot use your own code")
		return
	}

	// Persist to DB (Redis is cache; DB is source of truth)
	_, _ = h.store.CreateReferral(r.Context(), inviterID, u.ID)
	// Track in Redis for quick lookup
	_ = h.cache.LeaderboardAdd(r.Context(), referral.UserKey(inviterID), 1, u.ID)
	// Mark code as used for this user
	_ = h.cache.SetString(r.Context(), referral.Key(req.Code+":"+u.ID), "used", 30*24*time.Hour)

	// Check invite-3 bonus
	dbCount, _ := h.store.CountReferralsByReferrer(r.Context(), inviterID)
	bonusUnlocked := dbCount >= 3 && dbCount%3 == 0

	respondJSON(w, http.StatusOK, map[string]any{
		"status":         "redeemed",
		"bonus_unlocked": bonusUnlocked,
	})
}

// ReferralStats returns the current user's referral stats.
func (h *Handler) ReferralStats(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	// DB is authoritative; Redis is cache
	count, _ := h.store.CountReferralsByReferrer(r.Context(), u.ID)
	if count == 0 && h.cache != nil {
		top, _ := h.cache.LeaderboardTop(r.Context(), referral.UserKey(u.ID), 1000)
		count = len(top)
	}
	bonusUnlocked := count >= 3 && count%3 == 0

	respondJSON(w, http.StatusOK, map[string]any{
		"invited_count":  count,
		"bonus_unlocked": bonusUnlocked,
		"user_id":        u.ID,
	})
}
