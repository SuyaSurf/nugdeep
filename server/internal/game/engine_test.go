package game

import (
	"testing"
	"time"

	"games.bammby.com/server/internal/store"
)

func TestNewSession(t *testing.T) {
	words := []store.PuzzleWord{
		{Word: "Apple", CorrectCategory: "food", Decoys: []string{"tech"}},
		{Word: "Tesla", CorrectCategory: "tech", Decoys: []string{"food", "travel"}},
	}
	s := NewSession("s1", "p1", "u1", "", nil, words, 50)
	if s.Result != ResultInProgress {
		t.Fatalf("expected in_progress, got %s", s.Result)
	}
	if s.TargetCount != 2 {
		t.Fatalf("expected target count 2, got %d", s.TargetCount)
	}
}

func TestSessionAnswer(t *testing.T) {
	words := []store.PuzzleWord{
		{Word: "Apple", CorrectCategory: "food", Decoys: []string{"tech"}},
		{Word: "Tesla", CorrectCategory: "tech", Decoys: []string{"food"}},
	}
	tests := []struct {
		name       string
		answers    []string
		wantResult []AnswerResult
		final      SessionResult
		progress   int
	}{
		{
			name:       "win_clean",
			answers:    []string{"food", "tech"},
			wantResult: []AnswerResult{AnswerCorrect, AnswerCorrect},
			final:      ResultWon,
			progress:   2,
		},
		{
			name:       "wrong_then_win",
			answers:    []string{"tech", "food", "tech"},
			wantResult: []AnswerResult{AnswerWrong, AnswerCorrect, AnswerCorrect},
			final:      ResultWon,
			progress:   2,
		},
		{
			name:       "all_wrong",
			answers:    []string{"tech", "tech"},
			wantResult: []AnswerResult{AnswerWrong, AnswerWrong},
			final:      ResultInProgress,
			progress:   0,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := NewSession("s1", "p1", "u1", "", nil, words, 50)
			for i, ans := range tt.answers {
				res, finished := s.Answer(ans)
				if res != tt.wantResult[i] {
					t.Fatalf("answer %d: expected %s, got %s", i, tt.wantResult[i], res)
				}
				if finished && i < len(tt.answers)-1 {
					t.Fatalf("answer %d: unexpected finish", i)
				}
			}
			if s.Result != tt.final {
				t.Fatalf("expected final %s, got %s", tt.final, s.Result)
			}
			if s.Progress != tt.progress {
				t.Fatalf("expected progress %d, got %d", tt.progress, s.Progress)
			}
		})
	}
}

func TestSessionExpired(t *testing.T) {
	words := []store.PuzzleWord{
		{Word: "Apple", CorrectCategory: "food", Decoys: []string{"tech"}},
	}
	s := NewSession("s1", "p1", "u1", "", nil, words, 1)
	time.Sleep(2 * time.Second)
	res, _ := s.Answer("food")
	if res != AnswerExpired {
		t.Fatalf("expected expired, got %s", res)
	}
	if s.Result != ResultExpired {
		t.Fatalf("expected session expired, got %s", s.Result)
	}
}

func TestManager(t *testing.T) {
	m := NewManager()
	words := []store.PuzzleWord{{Word: "A", CorrectCategory: "x", Decoys: []string{"y"}}}
	s := NewSession("s1", "p1", "u1", "", nil, words, 50)
	m.Add(s)
	got, ok := m.Get("s1")
	if !ok || got.ID != "s1" {
		t.Fatal("expected session in manager")
	}
	m.Remove("s1")
	_, ok = m.Get("s1")
	if ok {
		t.Fatal("expected session removed")
	}
}
