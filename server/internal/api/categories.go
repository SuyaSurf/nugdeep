package api

import "net/http"

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.store.ListCategories(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "db error")
		return
	}
	respondJSON(w, http.StatusOK, cats)
}
