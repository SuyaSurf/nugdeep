package auth

import (
	"context"
	"net/http"
	"os"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
)

// UserIDKey is the context key for the authenticated Clerk user ID.
type UserIDKey struct{}

// Middleware verifies Clerk session tokens and injects the user ID into context.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if token == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{
			Token: token,
		})
		if err != nil {
			http.Error(w, `{"error":"invalid_token"}`, http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), UserIDKey{}, claims.Subject)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// UserIDFromContext extracts the Clerk user ID from request context.
func UserIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(UserIDKey{}).(string)
	return v
}

// InitClerk sets the global Clerk API key from env.
func InitClerk() {
	skey := os.Getenv("CLERK_SECRET_KEY")
	if skey == "" {
		skey = "test"
	}
	clerk.SetKey(skey)
}
