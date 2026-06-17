package livekit

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"time"
)

// Service generates LiveKit tokens and manages rooms.
type Service struct {
	apiKey     string
	apiSecret  string
	url        string
	configured bool
}

// NewService creates a LiveKit service from env vars.
func NewService() *Service {
	apiKey := os.Getenv("LIVEKIT_API_KEY")
	apiSecret := os.Getenv("LIVEKIT_API_SECRET")
	url := os.Getenv("LIVEKIT_URL")
	if url == "" {
		url = "wss://livekit.example.com"
	}
	return &Service{
		apiKey:     apiKey,
		apiSecret:  apiSecret,
		url:        url,
		configured: apiKey != "" && apiSecret != "",
	}
}

// IsConfigured returns true if LiveKit credentials are present.
func (s *Service) IsConfigured() bool {
	return s.configured
}

// CreateToken generates a JWT join token for a room.
// When canPublish is false the participant is a listener only.
func (s *Service) CreateToken(room, identity string, canPublish bool) (string, error) {
	if !s.IsConfigured() {
		return "", fmt.Errorf("livekit not configured")
	}
	now := time.Now().UTC()
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	claims, _ := json.Marshal(map[string]any{
		"video": map[string]any{
			"room":         room,
			"roomJoin":     true,
			"canPublish":   canPublish,
			"canSubscribe": true,
		},
		"iss": s.apiKey,
		"sub": identity,
		"nbf": now.Unix(),
		"exp": now.Add(time.Hour).Unix(),
	})
	payload := base64.RawURLEncoding.EncodeToString(claims)
	signingInput := header + "." + payload
	mac := hmac.New(sha256.New, []byte(s.apiSecret))
	mac.Write([]byte(signingInput))
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return signingInput + "." + signature, nil
}

// URL returns the LiveKit server URL.
func (s *Service) URL() string {
	return s.url
}
