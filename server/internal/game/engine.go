package game

import (
	"errors"
	"sync"
	"time"

	"games.bammby.com/server/internal/store"
)

// Result of a single answer attempt.
type AnswerResult string

const (
	AnswerCorrect AnswerResult = "correct"
	AnswerWrong   AnswerResult = "wrong"
	AnswerExpired AnswerResult = "expired"
)

// Final session result.
type SessionResult string

const (
	ResultInProgress SessionResult = "in_progress"
	ResultWon        SessionResult = "won"
	ResultLost       SessionResult = "lost"
	ResultExpired    SessionResult = "expired"
)

// Session is an in-memory game session (server-authoritative).
type Session struct {
	ID            string             `json:"id"`
	PuzzleID      string             `json:"puzzle_id"`
	UserID        string             `json:"user_id"`
	Context       string             `json:"context"`
	ContextID     *string            `json:"context_id"`
	Words         []store.PuzzleWord `json:"-"` // never sent to client
	Deadline      time.Time          `json:"deadline"`
	TargetCount   int                `json:"target_count"`
	CurrentIndex  int                `json:"current_index"`
	Progress      int                `json:"progress"`
	Result        SessionResult      `json:"result"`
	WrongCount    int                `json:"wrong_count"`
	LastCorrectAt *time.Time         `json:"last_correct_at"`
}

// NewSession creates a session. Answers live only server-side.
func NewSession(id, puzzleID, userID, context string, contextID *string, words []store.PuzzleWord, timerSeconds int) *Session {
	return &Session{
		ID:           id,
		PuzzleID:     puzzleID,
		UserID:       userID,
		Context:      context,
		ContextID:    contextID,
		Words:        words,
		Deadline:     time.Now().UTC().Add(time.Duration(timerSeconds) * time.Second),
		TargetCount:  len(words),
		CurrentIndex: 0,
		Progress:     0,
		Result:       ResultInProgress,
	}
}

// CurrentWord returns the word the player must match now.
func (s *Session) CurrentWord() (store.PuzzleWord, bool) {
	if s.Result != ResultInProgress || s.CurrentIndex >= len(s.Words) {
		return store.PuzzleWord{}, false
	}
	return s.Words[s.CurrentIndex], true
}

// CategoriesForCurrent returns the correct category plus decoys for the current word.
func (s *Session) CategoriesForCurrent() []string {
	word, ok := s.CurrentWord()
	if !ok {
		return nil
	}
	out := []string{word.CorrectCategory}
	out = append(out, word.Decoys...)
	shuffleStrings(out)
	return out
}

// Answer processes a player answer.
func (s *Session) Answer(category string) (AnswerResult, bool) {
	if s.Result != ResultInProgress {
		return AnswerWrong, false
	}
	if time.Now().UTC().After(s.Deadline) {
		s.Result = ResultExpired
		return AnswerExpired, false
	}
	word, ok := s.CurrentWord()
	if !ok {
		s.Result = ResultWon
		return AnswerWrong, true
	}
	if category == word.CorrectCategory {
		now := time.Now().UTC()
		s.LastCorrectAt = &now
		s.CurrentIndex++
		s.Progress = s.CurrentIndex
		if s.CurrentIndex >= len(s.Words) {
			s.Result = ResultWon
			return AnswerCorrect, true
		}
		return AnswerCorrect, false
	}
	s.WrongCount++
	return AnswerWrong, false
}

// IsExpired returns true if the deadline has passed.
func (s *Session) IsExpired() bool {
	return time.Now().UTC().After(s.Deadline)
}

var ErrSessionNotFound = errors.New("session not found")

// Manager holds active in-memory sessions.
type Manager struct {
	mu       sync.RWMutex
	sessions map[string]*Session
}

func NewManager() *Manager {
	return &Manager{sessions: make(map[string]*Session)}
}

func (m *Manager) Add(s *Session) {
	m.mu.Lock()
	m.sessions[s.ID] = s
	m.mu.Unlock()
}

func (m *Manager) Get(id string) (*Session, bool) {
	m.mu.RLock()
	s, ok := m.sessions[id]
	m.mu.RUnlock()
	return s, ok
}

func (m *Manager) Remove(id string) {
	m.mu.Lock()
	delete(m.sessions, id)
	m.mu.Unlock()
}

// All returns a snapshot of all active sessions.
func (m *Manager) All() []*Session {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*Session, 0, len(m.sessions))
	for _, s := range m.sessions {
		out = append(out, s)
	}
	return out
}

// OpponentWon checks if the opponent in a dating match has already won.
func (m *Manager) OpponentWon(dateID, userID string) (bool, int) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, sess := range m.sessions {
		if sess.Context == "dating" && sess.ContextID != nil && *sess.ContextID == dateID && sess.UserID != userID {
			if sess.Result == ResultWon {
				return true, sess.Progress
			}
		}
	}
	return false, 0
}

// StartCleanup runs a background goroutine that removes expired sessions every interval.
func (m *Manager) StartCleanup(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now().UTC()
			m.mu.Lock()
			for id, s := range m.sessions {
				if now.After(s.Deadline) {
					delete(m.sessions, id)
				}
			}
			m.mu.Unlock()
		}
	}()
}

// simple Fisher-Yates shuffle for decoys
func shuffleStrings(a []string) {
	for i := len(a) - 1; i > 0; i-- {
		j := int(time.Now().UnixNano() % int64(i+1))
		a[i], a[j] = a[j], a[i]
	}
}
