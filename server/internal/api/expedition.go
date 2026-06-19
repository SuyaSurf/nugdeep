package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/expedition"
)

func (h *Handler) ExpeditionToday(w http.ResponseWriter, r *http.Request) {
	user, err := h.currentUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}
	payload, err := h.expeditionSvc.Today(r.Context(), user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) ExpeditionComplete(w http.ResponseWriter, r *http.Request) {
	user, err := h.currentUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}
	var req expedition.CompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request")
		return
	}
	payload, err := h.expeditionSvc.Complete(r.Context(), user.ID, req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) ExpeditionQuiz(w http.ResponseWriter, r *http.Request) {
	user, err := h.currentUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}
	var req expedition.QuizRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request")
		return
	}
	payload, err := h.expeditionSvc.SubmitQuiz(r.Context(), user.ID, req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) ExpeditionAtlas(w http.ResponseWriter, r *http.Request) {
	user, err := h.currentUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}
	payload, err := h.expeditionSvc.Atlas(r.Context(), user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) ExpeditionCountry(w http.ResponseWriter, r *http.Request) {
	user, err := h.currentUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}
	payload, err := h.expeditionSvc.Country(r.Context(), user.ID, chi.URLParam(r, "countryCode"))
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) ExpeditionLeaderboard(w http.ResponseWriter, r *http.Request) {
	date := chi.URLParam(r, "date")
	n := 20
	if q := r.URL.Query().Get("n"); q != "" {
		if parsed, err := strconv.Atoi(q); err == nil && parsed > 0 && parsed <= 100 {
			n = parsed
		}
	}
	payload, err := h.expeditionSvc.Leaderboard(r.Context(), date, n)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) currentUser(r *http.Request) (struct{ ID string }, error) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		return struct{ ID string }{}, err
	}
	return struct{ ID string }{ID: u.ID}, nil
}
