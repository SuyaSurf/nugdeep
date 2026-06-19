package expedition

import (
	"reflect"
	"testing"
	"time"
)

func TestDateKey(t *testing.T) {
	got := DateKey(time.Date(2026, 6, 17, 23, 59, 0, 0, time.FixedZone("WAT", 3600)))
	if got != "2026-06-17" {
		t.Fatalf("DateKey = %q, want 2026-06-17", got)
	}
}

func TestScoreChallengeClampsRange(t *testing.T) {
	cases := []struct {
		name string
		in   CompleteRequest
		want int
	}{
		{name: "perfect", in: CompleteRequest{RawScore: 1000, Accuracy: 1, DurationMS: 1000}, want: 1000},
		{name: "too high", in: CompleteRequest{RawScore: 2000, Accuracy: 1, DurationMS: 1000}, want: 1000},
		{name: "negative", in: CompleteRequest{RawScore: -20, Accuracy: 1, DurationMS: 1000}, want: 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := ScoreChallenge(tc.in); got != tc.want {
				t.Fatalf("ScoreChallenge = %d, want %d", got, tc.want)
			}
		})
	}
}

func TestScoreQuiz(t *testing.T) {
	questions := []QuizQuestion{
		{Question: "A", Options: []string{"a", "b", "c", "d"}, CorrectIndex: 0},
		{Question: "B", Options: []string{"a", "b", "c", "d"}, CorrectIndex: 2},
		{Question: "C", Options: []string{"a", "b", "c", "d"}, CorrectIndex: 1},
	}
	score, correct := ScoreQuiz(questions, []int{0, 1, 1})
	if score != 200 || correct != 2 {
		t.Fatalf("ScoreQuiz = (%d, %d), want (200, 2)", score, correct)
	}
}

func TestRewardsForStreak(t *testing.T) {
	got := RewardsForStreak(14)
	want := []string{"bronze_compass", "silver_map", "gold_accent"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("RewardsForStreak = %#v, want %#v", got, want)
	}
}

func TestSeedDestinationsValid(t *testing.T) {
	items := SeedDestinations()
	if len(items) != 30 {
		t.Fatalf("SeedDestinations length = %d, want 30", len(items))
	}
	seen := map[string]bool{}
	for _, item := range items {
		if item.CountryCode == "" || item.CountryName == "" || item.Region == "" || item.FlagEmoji == "" {
			t.Fatalf("invalid destination identity: %#v", item)
		}
		if item.DailyFact == "" || len(item.QuizCulture) != 3 || len(item.QuizLanguage) != 3 {
			t.Fatalf("invalid destination content for %s", item.CountryCode)
		}
		if seen[item.CountryCode] {
			t.Fatalf("duplicate country code %s", item.CountryCode)
		}
		seen[item.CountryCode] = true
	}
}

func TestDestinationForDateDeterministic(t *testing.T) {
	items := SeedDestinations()
	date := time.Date(2026, 6, 17, 0, 0, 0, 0, time.UTC)
	first := DestinationForDate(items, date)
	second := DestinationForDate(items, date)
	if first.CountryCode != second.CountryCode {
		t.Fatalf("DestinationForDate not deterministic: %s vs %s", first.CountryCode, second.CountryCode)
	}
}

func TestPublicDestinationUnlockedIncludesContentWithoutAnswers(t *testing.T) {
	destination := SeedDestinations()[0]
	payload := publicDestination(destination, true)

	if payload["daily_fact"] != destination.DailyFact {
		t.Fatalf("daily_fact missing from unlocked destination: %#v", payload)
	}
	culture, ok := payload["quiz_culture"].([]PublicQuizQuestion)
	if !ok {
		t.Fatalf("quiz_culture type = %T, want []PublicQuizQuestion", payload["quiz_culture"])
	}
	if len(culture) != 3 || culture[0].Question == "" || len(culture[0].Options) != 4 {
		t.Fatalf("quiz_culture missing playable questions: %#v", culture)
	}
}

func TestPublicDestinationLockedHidesFactAndQuizzes(t *testing.T) {
	destination := SeedDestinations()[0]
	payload := publicDestination(destination, false)

	if _, ok := payload["daily_fact"]; ok {
		t.Fatalf("locked destination exposed daily_fact: %#v", payload)
	}
	if _, ok := payload["quiz_culture"]; ok {
		t.Fatalf("locked destination exposed quiz_culture: %#v", payload)
	}
}

func TestStoreSeedDestinationsMarshalContent(t *testing.T) {
	items := StoreSeedDestinations()
	if len(items) != 30 {
		t.Fatalf("StoreSeedDestinations length = %d, want 30", len(items))
	}
	if len(items[0].QuizCulture) == 0 || len(items[0].QuizLanguage) == 0 || len(items[0].ChallengeParams) == 0 {
		t.Fatalf("store seed is missing JSON content: %#v", items[0])
	}
}
