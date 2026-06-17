package api

import (
	"context"
	"net/http"

	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/store"
)

// EnsureUser auto-creates a user record if one doesn't exist for the authenticated Clerk user.
func (h *Handler) EnsureUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clerkID := auth.UserIDFromContext(r.Context())
		if clerkID == "" {
			next.ServeHTTP(w, r)
			return
		}
		_, err := h.store.GetUserByClerkID(r.Context(), clerkID)
		if err != nil {
			u, err := h.store.CreateUser(r.Context(), &store.User{
				ClerkID:  clerkID,
				Username: "user_" + clerkID,
			})
			if err != nil {
				http.Error(w, `{"error":"failed to create user"}`, http.StatusInternalServerError)
				return
			}
			ctx := context.WithValue(r.Context(), auth.UserIDKey{}, u.ID)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}
		next.ServeHTTP(w, r)
	})
}
