package moderation

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// Service provides content moderation via OpenAI (or stub when unconfigured).
type Service struct {
	apiKey string
	client *http.Client
}

// NewService creates a moderation service from OPENAI_API_KEY env.
func NewService() *Service {
	return &Service{
		apiKey: os.Getenv("OPENAI_API_KEY"),
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

// IsConfigured returns true if the OpenAI key is present.
func (s *Service) IsConfigured() bool {
	return s.apiKey != ""
}

// Result is the outcome of a moderation check.
type Result struct {
	Flagged   bool     `json:"flagged"`
	Categories []string `json:"categories,omitempty"`
	Score     float64  `json:"score,omitempty"`
}

// Check sends text to OpenAI moderation API. Returns stub-pass when unconfigured.
func (s *Service) Check(text string) (*Result, error) {
	if !s.IsConfigured() {
		return &Result{Flagged: false}, nil
	}

	payload := map[string]any{"input": text}
	b, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "https://api.openai.com/v1/moderations", bytes.NewReader(b))
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("moderation request failed: %w", err)
	}
	defer resp.Body.Close()

	var body struct {
		Results []struct {
			Flagged    bool               `json:"flagged"`
			Categories map[string]bool    `json:"categories"`
			Scores     map[string]float64 `json:"category_scores"`
		} `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	if len(body.Results) == 0 {
		return &Result{Flagged: false}, nil
	}

	r := body.Results[0]
	var cats []string
	for cat, flagged := range r.Categories {
		if flagged {
			cats = append(cats, cat)
		}
	}
	return &Result{Flagged: r.Flagged, Categories: cats}, nil
}
