package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/store"
)

func (h *Handler) CreateCommunity(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name        string       `json:"name"`
		Description string       `json:"description"`
		Hint        string       `json:"hint"`
		IconURL     string       `json:"icon_url"`
		MaxMembers  *int         `json:"max_members"`
		Hidden      bool         `json:"hidden"`
		Puzzle      store.Puzzle `json:"puzzle"`
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
	c := &store.Community{
		Slug:        slugify(req.Name),
		Name:        req.Name,
		Description: req.Description,
		Hint:        req.Hint,
		IconURL:     req.IconURL,
		MaxMembers:  req.MaxMembers,
		Hidden:      req.Hidden,
	}
	comm, err := h.commSvc.Create(r.Context(), u.ID, c, &req.Puzzle)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, comm)
}

func (h *Handler) CommunityPreview(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	c, err := h.store.GetCommunityBySlug(r.Context(), slug)
	if err != nil {
		respondError(w, http.StatusNotFound, "community not found")
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{
		"name": c.Name,
		"hint": c.Hint,
	})
}

func (h *Handler) GetCommunity(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	c, err := h.store.GetCommunityBySlug(r.Context(), slug)
	if err != nil {
		respondError(w, http.StatusNotFound, "community not found")
		return
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	member, _ := h.store.GetMembership(r.Context(), c.ID, u.ID)
	isMember := member != nil
	respondJSON(w, http.StatusOK, map[string]any{
		"id":          c.ID,
		"slug":        c.Slug,
		"name":        c.Name,
		"description": c.Description,
		"hint":        c.Hint,
		"icon_url":    c.IconURL,
		"puzzle_id":   c.PuzzleID,
		"max_members": c.MaxMembers,
		"hidden":      c.Hidden,
		"is_member":   isMember,
		"member_role": func() string {
			if member != nil {
				return member.Role
			}
			return ""
		}(),
	})
}

func (h *Handler) MintCode(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	c, err := h.store.GetCommunityBySlug(r.Context(), slug)
	if err != nil {
		respondError(w, http.StatusNotFound, "community not found")
		return
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	member, _ := h.store.GetMembership(r.Context(), c.ID, u.ID)
	if member == nil || (member.Role != "owner" && member.Role != "moderator") {
		respondError(w, http.StatusForbidden, "not allowed")
		return
	}
	uc, err := h.commSvc.MintCode(r.Context(), c.ID, u.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "mint failed")
		return
	}
	respondJSON(w, http.StatusCreated, uc)
}

func (h *Handler) RedeemCode(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	c, err := h.commSvc.RedeemCode(r.Context(), code, u.ID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, c)
}

func (h *Handler) ListMembers(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	c, err := h.store.GetCommunityBySlug(r.Context(), slug)
	if err != nil {
		respondError(w, http.StatusNotFound, "community not found")
		return
	}
	members, err := h.store.ListMembers(r.Context(), c.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "db error")
		return
	}
	respondJSON(w, http.StatusOK, members)
}

func (h *Handler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	targetID := chi.URLParam(r, "userID")
	c, err := h.store.GetCommunityBySlug(r.Context(), slug)
	if err != nil {
		respondError(w, http.StatusNotFound, "community not found")
		return
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	mem, _ := h.store.GetMembership(r.Context(), c.ID, u.ID)
	if mem == nil || (mem.Role != "owner" && mem.Role != "moderator") {
		respondError(w, http.StatusForbidden, "not allowed")
		return
	}
	if err := h.store.DeleteMembership(r.Context(), c.ID, targetID); err != nil {
		respondError(w, http.StatusInternalServerError, "remove failed")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

func (h *Handler) UpdateMemberRole(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	targetID := chi.URLParam(r, "userID")
	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Role == "" {
		respondError(w, http.StatusBadRequest, "role required")
		return
	}
	c, err := h.store.GetCommunityBySlug(r.Context(), slug)
	if err != nil {
		respondError(w, http.StatusNotFound, "community not found")
		return
	}
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	mem, _ := h.store.GetMembership(r.Context(), c.ID, u.ID)
	if mem == nil || mem.Role != "owner" {
		respondError(w, http.StatusForbidden, "only owner can change roles")
		return
	}
	if err := h.store.UpdateMembershipRole(r.Context(), c.ID, targetID, req.Role); err != nil {
		respondError(w, http.StatusInternalServerError, "update failed")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) Spotlight(w http.ResponseWriter, r *http.Request) {
	// Placeholder: return first boosted community
	list, err := h.store.ListCommunities(r.Context(), store.CommunityFilter{Boosted: true, Limit: 1})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "db error")
		return
	}
	if len(list) == 0 {
		respondJSON(w, http.StatusOK, nil)
		return
	}
	respondJSON(w, http.StatusOK, list[0])
}

func (h *Handler) Discover(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 20
	}
	list, err := h.store.ListCommunities(r.Context(), store.CommunityFilter{Hidden: boolPtr(false), Limit: limit})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "db error")
		return
	}
	respondJSON(w, http.StatusOK, list)
}

func boolPtr(b bool) *bool { return &b }

func slugify(name string) string {
	// Naive slugify for MVP.
	out := []rune{}
	for _, ch := range name {
		if ch >= 'a' && ch <= 'z' || ch >= '0' && ch <= '9' {
			out = append(out, ch)
		} else if ch >= 'A' && ch <= 'Z' {
			out = append(out, ch+('a'-'A'))
		} else if ch == ' ' || ch == '-' {
			out = append(out, '-')
		}
	}
	return string(out)
}
