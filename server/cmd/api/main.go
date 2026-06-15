package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"games.bammby.com/server/internal/api"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/cache"
	"games.bammby.com/server/internal/livekit"
	"games.bammby.com/server/internal/ratelimit"
	"games.bammby.com/server/internal/store"
	"games.bammby.com/server/internal/ws"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	pool, err := store.NewPool(ctx)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	repo := store.NewPgStore(pool)
	redisCache := cache.NewCache()
	if err := redisCache.Ping(ctx); err != nil {
		log.Printf("redis: %v (continuing without cache)", err)
	}
	lkService := livekit.NewService()
	hub := ws.NewHub()
	go hub.Run()
	handler := api.NewHandler(repo, lkService, redisCache, hub)
	auth.InitClerk()

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	allowedOrigins := []string{"http://localhost:3000", "https://games.bammby.com"}
	if envOrigins := os.Getenv("ALLOWED_ORIGINS"); envOrigins != "" {
		allowedOrigins = strings.Split(envOrigins, ",")
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Global rate limit: 120 req / min per IP or user
	rateLimiter := ratelimit.New(redisCache, time.Minute, 120)
	r.Use(rateLimiter.Handler)

	handler.Routes(r)

	r.Get("/ws", hub.ServeHTTP)

	// Clean up stale lobby queue entries every 10 seconds
	go handler.StartLobbyCleanup(10 * time.Second)

	// Clean up stale in-memory game sessions every minute
	go handler.StartGameCleanup(time.Minute)
	// Clean up finished word card games every minute
	go handler.StartWordCardCleanup(time.Minute)
	// Expire stale dating matches every 2 minutes
	go handler.StartMatchExpiry(2 * time.Minute)
	// Flip decided dating matches after 120s expiry every 10 seconds
	go handler.StartDateFlipWorker(10 * time.Second)
	// Close expired 24h audio spaces every 5 minutes
	go handler.StartSpaceExpiry(5 * time.Minute)
	// Auto-shadow-ban users with 3+ reports in 7 days every 10 minutes
	go handler.StartShadowBanWorker(10 * time.Minute)
	// Reset streaks for users who missed a day every hour
	go handler.StartStreakResetWorker(time.Hour)
	// Purge inactive users (>12 months) weekly
	go handler.StartInactivePurgeWorker(7 * 24 * time.Hour)

	// Clerk webhook: create/update user on sign-up.
	r.Post("/webhooks/clerk", func(w http.ResponseWriter, r *http.Request) {
		webhookSecret := os.Getenv("CLERK_WEBHOOK_SECRET")
		if webhookSecret == "" {
			http.Error(w, `{"error":"webhook not configured"}`, http.StatusInternalServerError)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "bad body", http.StatusBadRequest)
			return
		}

		// Svix signature verification
		svixID := r.Header.Get("svix-id")
		svixTimestamp := r.Header.Get("svix-timestamp")
		svixSignature := r.Header.Get("svix-signature")
		if svixID == "" || svixTimestamp == "" || svixSignature == "" {
			http.Error(w, `{"error":"missing webhook headers"}`, http.StatusBadRequest)
			return
		}

		signedContent := svixTimestamp + "." + string(body)
		mac := hmac.New(sha256.New, []byte(webhookSecret))
		mac.Write([]byte(signedContent))
		expectedSig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

		valid := false
		for _, sig := range strings.Split(svixSignature, ",") {
			sig = strings.TrimSpace(sig)
			if strings.HasPrefix(sig, "v1,") {
				sig = strings.TrimPrefix(sig, "v1,")
			}
			if sig == expectedSig {
				valid = true
				break
			}
		}
		if !valid {
			http.Error(w, `{"error":"invalid signature"}`, http.StatusUnauthorized)
			return
		}

		var payload struct {
			Type string `json:"type"`
			Data struct {
				ID             string `json:"id"`
				Username       string `json:"username"`
				FirstName      string `json:"first_name"`
				Email          string `json:"email_address"`
				EmailAddresses []struct {
					EmailAddress string `json:"email_address"`
					Verification *struct {
						Status string `json:"status"`
					} `json:"verification,omitempty"`
				} `json:"email_addresses,omitempty"`
				PhoneNumbers []struct {
					PhoneNumber  string `json:"phone_number"`
					Verification *struct {
						Status string `json:"status"`
					} `json:"verification,omitempty"`
				} `json:"phone_numbers,omitempty"`
				UnsafeMetadata map[string]any `json:"unsafe_metadata,omitempty"`
				PublicMetadata map[string]any `json:"public_metadata,omitempty"`
			} `json:"data"`
		}
		if err := json.Unmarshal(body, &payload); err != nil {
			http.Error(w, "bad body", http.StatusBadRequest)
			return
		}
		if payload.Type == "user.created" || payload.Type == "user.updated" {
			username := payload.Data.Username
			if username == "" {
				username = payload.Data.FirstName
			}
			if username == "" {
				username = "user_" + payload.Data.ID[:8]
			}

			emailVerified := false
			for _, e := range payload.Data.EmailAddresses {
				if e.Verification != nil && e.Verification.Status == "verified" {
					emailVerified = true
					break
				}
			}
			phoneVerified := false
			for _, p := range payload.Data.PhoneNumbers {
				if p.Verification != nil && p.Verification.Status == "verified" {
					phoneVerified = true
					break
				}
			}

			u, _ := repo.GetUserByClerkID(r.Context(), payload.Data.ID)
			if u == nil {
				_, _ = repo.CreateUser(r.Context(), &store.User{
					ClerkID:       payload.Data.ID,
					Username:      username,
					EmailVerified: emailVerified,
					PhoneVerified: phoneVerified,
				})
			} else {
				u.Username = username
				u.EmailVerified = emailVerified
				u.PhoneVerified = phoneVerified
				_ = repo.UpdateUser(r.Context(), u)
			}
		}
		w.WriteHeader(http.StatusOK)
	})

	log.Printf("server listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
