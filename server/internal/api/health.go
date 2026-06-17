package api

import (
	"context"
	"net/http"
	"time"
)

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	status := "ok"
	httpStatus := http.StatusOK

	// Check DB via a lightweight ping
	dbOK := true
	if err := h.store.Ping(ctx); err != nil {
		dbOK = false
	}

	// Check Redis
	redisOK := false
	if h.cache != nil {
		if err := h.cache.Ping(ctx); err == nil {
			redisOK = true
		}
	}

	if !dbOK || !redisOK {
		status = "degraded"
		httpStatus = http.StatusServiceUnavailable
	}

	respondJSON(w, httpStatus, map[string]any{
		"status": status,
		"dependencies": map[string]bool{
			"database": dbOK,
			"redis":    redisOK,
		},
	})
}
