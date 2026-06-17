package ratelimit

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"time"

	"games.bammby.com/server/internal/cache"
)

// Middleware implements token-bucket-ish per-key rate limiting using Redis.
type Middleware struct {
	cache      *cache.Cache
	window     time.Duration
	maxReq     int
	keyPrefix  string
}

// New creates a rate-limit middleware. maxReq is requests per window.
func New(c *cache.Cache, window time.Duration, maxReq int) *Middleware {
	return &Middleware{
		cache:     c,
		window:    window,
		maxReq:    maxReq,
		keyPrefix: "ratelimit",
	}
}

// Handler is chi-compatible middleware.
func (m *Middleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if m.cache == nil {
			next.ServeHTTP(w, r)
			return
		}

		key := m.key(r)
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		pipe := m.cache.Pipeline(ctx)
		incr := pipe.Incr(ctx, key)
		pipe.Expire(ctx, key, m.window)
		_, _ = pipe.Exec(ctx)

		count, _ := incr.Result()
		if int(count) > m.maxReq {
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(m.maxReq))
			w.Header().Set("X-RateLimit-Remaining", "0")
			http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}

		remaining := m.maxReq - int(count)
		if remaining < 0 {
			remaining = 0
		}
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(m.maxReq))
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
		next.ServeHTTP(w, r)
	})
}

func (m *Middleware) key(r *http.Request) string {
	// Prefer authenticated user ID, fall back to IP.
	userID := r.Header.Get("X-User-ID")
	if userID != "" {
		return fmt.Sprintf("%s:user:%s:%s", m.keyPrefix, userID, r.Method)
	}
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	if ip == "" {
		ip = r.RemoteAddr
	}
	return fmt.Sprintf("%s:ip:%s:%s", m.keyPrefix, ip, r.Method)
}
