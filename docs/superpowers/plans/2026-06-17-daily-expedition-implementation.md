# Daily Expedition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Nugdeep's Daily Expedition: one daily country-themed solo challenge, country unlock, daily fact reveal, two 3-question quizzes, streak rewards, atlas collection, leaderboard, and share flow.

**Architecture:** Add a focused `expedition` backend service around PostgreSQL persistence and existing Redis leaderboard helpers, then add typed frontend data helpers and atomic React screens under `web/app/expedition`. MVP ships a country atlas grid first, with data structures ready for an interactive map later.

**Tech Stack:** Go 1.26, Chi, pgx/PostgreSQL migrations, Redis leaderboard helpers, Next.js 16, React 19, TypeScript, existing game engines, node:test.

---

## Scope

This plan implements the shippable MVP and leaves deliberate extension seams for the full world map and image share cards.

**MVP includes:**
- 30 seeded countries.
- Daily destination API.
- Challenge result submission with server-side score validation.
- Daily fact unlock.
- Two 3-question quizzes per country.
- User atlas grid/list.
- Streak tracking and reward IDs.
- Redis daily leaderboard.
- Text share card.
- Lobby/home entry point.

**Not included in MVP:**
- Interactive SVG/world map.
- Auto-generated PNG share card.
- Community-submitted facts.
- Multiplayer expedition races.

---

## File Structure

### Backend files

- Create: `server/migrations/018_daily_expeditions.up.sql`
  - Creates destination, atlas, quiz attempt, streak, and leaderboard persistence tables.
- Create: `server/migrations/018_daily_expeditions.down.sql`
  - Drops expedition tables in dependency order.
- Create: `server/internal/expedition/types.go`
  - Domain types, request/response DTOs, challenge scoring helpers.
- Create: `server/internal/expedition/seed.go`
  - First 30 country seed records and deterministic date rotation helper.
- Create: `server/internal/expedition/service.go`
  - Business logic: today status, challenge completion, quiz submission, atlas, streak, rewards.
- Create: `server/internal/expedition/service_test.go`
  - Unit tests for scoring, deterministic rotation, quiz scoring, streak reward thresholds.
- Create: `server/internal/store/expedition.go`
  - PostgreSQL repository methods for expedition data.
- Modify: `server/internal/store/store.go`
  - Add expedition structs and repository method signatures.
- Create: `server/internal/api/expedition.go`
  - HTTP handlers for expedition endpoints.
- Modify: `server/internal/api/api.go`
  - Add `expeditionSvc` and expedition route registrations.
- Modify: `server/internal/cache/cache.go`
  - Add `ExpeditionLeaderboardKey(date string)` helper or reuse `LeaderboardKey("expedition", date)` explicitly.

### Frontend files

- Create: `web/lib/expedition.ts`
  - Types, API functions, local score helpers, reward constants, share text builder.
- Create: `web/lib/expedition.test.ts`
  - Unit tests for share text, score formatting, reward threshold helpers.
- Create: `web/components/expedition/ExpeditionCard.tsx`
  - Home/lobby card entry point.
- Create: `web/components/expedition/ExpeditionChallenge.tsx`
  - Routes challenge config to a themed challenge component.
- Create: `web/components/expedition/challenges/ButtonExpedition.tsx`
  - Button/timing challenge variant.
- Create: `web/components/expedition/challenges/PaletteExpedition.tsx`
  - Palette/flag memory challenge variant.
- Create: `web/components/expedition/challenges/QuickDrawExpedition.tsx`
  - Quick draw themed recognition challenge variant.
- Create: `web/components/expedition/challenges/FoodRemedyExpedition.tsx`
  - Knowledge-style multiple choice challenge variant.
- Create: `web/components/expedition/ExpeditionReveal.tsx`
  - Country unlock reveal and daily fact screen.
- Create: `web/components/expedition/ExpeditionQuiz.tsx`
  - Culture/language quiz flow.
- Create: `web/components/expedition/AtlasGrid.tsx`
  - MVP atlas grid/list.
- Create: `web/components/expedition/ShareCardText.tsx`
  - Text share UI.
- Create: `web/app/expedition/page.tsx`
  - Main daily expedition route.
- Create: `web/app/atlas/page.tsx`
  - User atlas route.
- Modify: `web/app/page.tsx` or arrival scene component that renders home actions
  - Add Today's Expedition entry point where current arrival/home actions live.
- Modify: `web/app/lobby/page.tsx`
  - Add Today's Expedition card above lobby flow or as a first-class route button.
- Modify: `web/package.json`
  - Add `test:expedition` script.

---

## Data Model

### `daily_expedition_destinations`

One row per country content pack. The daily route is deterministic by date and seed order, so this table stores content, not every calendar day.

```sql
CREATE TABLE daily_expedition_destinations (
    country_code TEXT PRIMARY KEY,
    country_name TEXT NOT NULL,
    region TEXT NOT NULL,
    flag_emoji TEXT NOT NULL,
    daily_fact TEXT NOT NULL,
    deep_dive_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
    quiz_culture JSONB NOT NULL DEFAULT '[]'::jsonb,
    quiz_language JSONB NOT NULL DEFAULT '[]'::jsonb,
    challenge_type TEXT NOT NULL,
    challenge_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    score_threshold INT NOT NULL DEFAULT 700,
    rotation_weight INT NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `user_expedition_atlas`

One row per unlocked country per user.

```sql
CREATE TABLE user_expedition_atlas (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL REFERENCES daily_expedition_destinations(country_code) ON DELETE CASCADE,
    discovered_date DATE NOT NULL,
    expedition_score INT NOT NULL DEFAULT 0,
    quiz_culture_score INT NOT NULL DEFAULT 0,
    quiz_language_score INT NOT NULL DEFAULT 0,
    total_score INT NOT NULL DEFAULT 0,
    streak_shield_earned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, country_code)
);
```

### `user_expedition_streaks`

Separate from existing puzzle streak so expedition can evolve without breaking current daily puzzle behavior.

```sql
CREATE TABLE user_expedition_streaks (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_played_date DATE,
    streak_shields INT NOT NULL DEFAULT 0,
    active_rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `daily_expedition_scores`

Persisted leaderboard source; Redis remains the fast top-N cache.

```sql
CREATE TABLE daily_expedition_scores (
    date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL REFERENCES daily_expedition_destinations(country_code) ON DELETE CASCADE,
    expedition_score INT NOT NULL DEFAULT 0,
    quiz_score INT NOT NULL DEFAULT 0,
    total_score INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (date, user_id)
);
```

---

## API Contract

All endpoints are under the existing authenticated `/api/v1` group.

### `GET /api/v1/expedition/today`

Returns today's destination teaser and user status. Hide `daily_fact`, `deep_dive_facts`, and quiz answer keys until unlock.

```json
{
  "date": "2026-06-17",
  "destination": {
    "country_code": "JP",
    "country_name": "Japan",
    "region": "East Asia",
    "flag_emoji": "🇯🇵",
    "challenge_type": "palette",
    "challenge_params": {
      "theme": "flag_memory",
      "colors": ["#bc002d", "#ffffff"],
      "prompt": "Memorize the flag colors. Rebuild them from memory."
    },
    "score_threshold": 700
  },
  "status": {
    "unlocked": false,
    "completed_today": false,
    "expedition_score": 0,
    "quiz_culture_score": 0,
    "quiz_language_score": 0,
    "total_score": 0
  },
  "streak": {
    "current_streak": 7,
    "longest_streak": 12,
    "streak_shields": 1,
    "active_rewards": ["bronze_compass", "silver_map"]
  },
  "atlas": {
    "discovered": 12,
    "total": 195
  }
}
```

### `POST /api/v1/expedition/complete`

Request:

```json
{
  "country_code": "JP",
  "challenge_type": "palette",
  "raw_score": 842,
  "duration_ms": 27120,
  "accuracy": 0.91
}
```

Response on unlock:

```json
{
  "unlocked": true,
  "country_code": "JP",
  "country_name": "Japan",
  "flag_emoji": "🇯🇵",
  "daily_fact": "The Shinkansen's average delay is less than one minute across the network.",
  "expedition_score": 842,
  "score_threshold": 700,
  "streak": {
    "current_streak": 8,
    "longest_streak": 12,
    "streak_shields": 1,
    "active_rewards": ["bronze_compass", "silver_map"]
  },
  "leaderboard_rank": 1247
}
```

### `POST /api/v1/expedition/quiz`

Request:

```json
{
  "country_code": "JP",
  "quiz_type": "culture",
  "answers": [0, 2, 1]
}
```

Response:

```json
{
  "quiz_type": "culture",
  "score": 300,
  "correct": 3,
  "total": 3,
  "streak_shield_earned": false,
  "deep_dive_facts": [
    "Japan has millions of vending machines.",
    "The word tsunami comes from Japanese.",
    "Square watermelons are grown as gifts."
  ],
  "total_score": 1142
}
```

### `GET /api/v1/atlas`

Returns all active countries with per-user unlock status.

### `GET /api/v1/atlas/{countryCode}`

Returns one country detail. For locked countries, return teaser fields only.

### `GET /api/v1/expedition/leaderboard/{date}`

Returns top N scores from Redis if available, with DB fallback.

---

## Task 1: Backend Migration

**Files:**
- Create: `server/migrations/018_daily_expeditions.up.sql`
- Create: `server/migrations/018_daily_expeditions.down.sql`

- [ ] **Step 1: Create the migration up file**

```sql
CREATE TABLE daily_expedition_destinations (
    country_code TEXT PRIMARY KEY,
    country_name TEXT NOT NULL,
    region TEXT NOT NULL,
    flag_emoji TEXT NOT NULL,
    daily_fact TEXT NOT NULL,
    deep_dive_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
    quiz_culture JSONB NOT NULL DEFAULT '[]'::jsonb,
    quiz_language JSONB NOT NULL DEFAULT '[]'::jsonb,
    challenge_type TEXT NOT NULL,
    challenge_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    score_threshold INT NOT NULL DEFAULT 700,
    rotation_weight INT NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_expedition_atlas (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL REFERENCES daily_expedition_destinations(country_code) ON DELETE CASCADE,
    discovered_date DATE NOT NULL,
    expedition_score INT NOT NULL DEFAULT 0,
    quiz_culture_score INT NOT NULL DEFAULT 0,
    quiz_language_score INT NOT NULL DEFAULT 0,
    total_score INT NOT NULL DEFAULT 0,
    streak_shield_earned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, country_code)
);

CREATE TABLE user_expedition_streaks (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_played_date DATE,
    streak_shields INT NOT NULL DEFAULT 0,
    active_rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_expedition_scores (
    date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL REFERENCES daily_expedition_destinations(country_code) ON DELETE CASCADE,
    expedition_score INT NOT NULL DEFAULT 0,
    quiz_score INT NOT NULL DEFAULT 0,
    total_score INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (date, user_id)
);

CREATE INDEX idx_daily_expedition_destinations_active ON daily_expedition_destinations(active, country_code);
CREATE INDEX idx_user_expedition_atlas_user ON user_expedition_atlas(user_id, discovered_date DESC);
CREATE INDEX idx_daily_expedition_scores_date_score ON daily_expedition_scores(date, total_score DESC);
```

- [ ] **Step 2: Create the migration down file**

```sql
DROP TABLE IF EXISTS daily_expedition_scores;
DROP TABLE IF EXISTS user_expedition_streaks;
DROP TABLE IF EXISTS user_expedition_atlas;
DROP TABLE IF EXISTS daily_expedition_destinations;
```

- [ ] **Step 3: Run migration locally**

Run from repo root:

```bash
./build.sh
```

Expected: migrations apply without SQL errors.

- [ ] **Step 4: Commit**

```bash
git add server/migrations/018_daily_expeditions.up.sql server/migrations/018_daily_expeditions.down.sql
git commit -m "feat: add daily expedition schema"
```

---

## Task 2: Backend Domain Types and Tests

**Files:**
- Create: `server/internal/expedition/types.go`
- Create: `server/internal/expedition/service_test.go`

- [ ] **Step 1: Write failing unit tests**

Create `server/internal/expedition/service_test.go`:

```go
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
```

- [ ] **Step 2: Run tests and verify failure**

```bash
go test ./internal/expedition
```

Expected: FAIL because package/files do not exist.

- [ ] **Step 3: Implement domain types and helpers**

Create `server/internal/expedition/types.go`:

```go
package expedition

import (
	"math"
	"time"
)

type ChallengeType string

const (
	ChallengeButton     ChallengeType = "the_button"
	ChallengePalette    ChallengeType = "palette"
	ChallengeQuickDraw  ChallengeType = "quick_draw"
	ChallengeFoodRemedy ChallengeType = "food_remedy"
)

type QuizType string

const (
	QuizCulture  QuizType = "culture"
	QuizLanguage QuizType = "language"
)

type QuizQuestion struct {
	Question     string   `json:"question"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correct_index"`
}

type Destination struct {
	CountryCode   string         `json:"country_code"`
	CountryName   string         `json:"country_name"`
	Region        string         `json:"region"`
	FlagEmoji     string         `json:"flag_emoji"`
	DailyFact     string         `json:"daily_fact"`
	DeepDiveFacts []string       `json:"deep_dive_facts"`
	QuizCulture   []QuizQuestion `json:"quiz_culture"`
	QuizLanguage  []QuizQuestion `json:"quiz_language"`
	ChallengeType ChallengeType  `json:"challenge_type"`
	ChallengeParams map[string]any `json:"challenge_params"`
	ScoreThreshold int           `json:"score_threshold"`
	Active         bool          `json:"active"`
}

type AtlasEntry struct {
	UserID             string    `json:"user_id"`
	CountryCode        string    `json:"country_code"`
	DiscoveredDate     time.Time `json:"discovered_date"`
	ExpeditionScore    int       `json:"expedition_score"`
	QuizCultureScore   int       `json:"quiz_culture_score"`
	QuizLanguageScore  int       `json:"quiz_language_score"`
	TotalScore         int       `json:"total_score"`
	StreakShieldEarned bool      `json:"streak_shield_earned"`
}

type Streak struct {
	UserID         string     `json:"user_id"`
	CurrentStreak  int        `json:"current_streak"`
	LongestStreak  int        `json:"longest_streak"`
	LastPlayedDate *time.Time `json:"last_played_date"`
	StreakShields  int        `json:"streak_shields"`
	ActiveRewards  []string   `json:"active_rewards"`
}

type CompleteRequest struct {
	CountryCode   string        `json:"country_code"`
	ChallengeType ChallengeType `json:"challenge_type"`
	RawScore      int           `json:"raw_score"`
	DurationMS    int           `json:"duration_ms"`
	Accuracy      float64       `json:"accuracy"`
}

type QuizRequest struct {
	CountryCode string   `json:"country_code"`
	QuizType    QuizType `json:"quiz_type"`
	Answers     []int    `json:"answers"`
}

func DateKey(t time.Time) string {
	return t.UTC().Format("2006-01-02")
}

func ScoreChallenge(req CompleteRequest) int {
	score := req.RawScore
	if req.Accuracy > 0 && req.Accuracy <= 1 && score == 0 {
		score = int(math.Round(req.Accuracy * 1000))
	}
	if score < 0 {
		return 0
	}
	if score > 1000 {
		return 1000
	}
	return score
}

func ScoreQuiz(questions []QuizQuestion, answers []int) (int, int) {
	correct := 0
	for index, question := range questions {
		if index < len(answers) && answers[index] == question.CorrectIndex {
			correct++
		}
	}
	return correct * 100, correct
}

func RewardsForStreak(streak int) []string {
	rewards := []string{}
	if streak >= 3 {
		rewards = append(rewards, "bronze_compass")
	}
	if streak >= 7 {
		rewards = append(rewards, "silver_map")
	}
	if streak >= 14 {
		rewards = append(rewards, "gold_accent")
	}
	if streak >= 30 {
		rewards = append(rewards, "master_explorer")
	}
	if streak >= 50 {
		rewards = append(rewards, "legendary_cartographer")
	}
	return rewards
}
```

- [ ] **Step 4: Run tests**

```bash
go test ./internal/expedition
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/internal/expedition/types.go server/internal/expedition/service_test.go
git commit -m "feat: add expedition domain helpers"
```

---

## Task 3: Seed Data and Rotation

**Files:**
- Create: `server/internal/expedition/seed.go`
- Modify: `server/internal/expedition/service_test.go`

- [ ] **Step 1: Add failing rotation and seed tests**

Append to `server/internal/expedition/service_test.go`:

```go
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
```

- [ ] **Step 2: Run tests and verify failure**

```bash
go test ./internal/expedition
```

Expected: FAIL because `SeedDestinations` and `DestinationForDate` are missing.

- [ ] **Step 3: Implement seed and rotation**

Create `server/internal/expedition/seed.go` with exactly this implementation. The seed keeps MVP content compact while still giving each country a unique daily fact, language hook, and challenge theme.

```go
package expedition

import "time"

type destinationSeed struct {
	Code      string
	Name      string
	Region    string
	Flag      string
	Capital   string
	Language  string
	Hello     string
	Thanks    string
	Fact      string
	Challenge ChallengeType
	Colors    []string
}

func SeedDestinations() []Destination {
	rows := []destinationSeed{
		{Code: "JP", Name: "Japan", Region: "East Asia", Flag: "🇯🇵", Capital: "Tokyo", Language: "Japanese", Hello: "konnichiwa", Thanks: "arigato", Fact: "The Shinkansen's average delay is less than one minute across the network.", Challenge: ChallengePalette, Colors: []string{"#bc002d", "#ffffff"}},
		{Code: "BR", Name: "Brazil", Region: "South America", Flag: "🇧🇷", Capital: "Brasília", Language: "Portuguese", Hello: "olá", Thanks: "obrigado", Fact: "Brazil is home to most of the Amazon rainforest, the largest tropical rainforest on Earth.", Challenge: ChallengeButton, Colors: []string{"#009b3a", "#ffdf00", "#002776"}},
		{Code: "EG", Name: "Egypt", Region: "North Africa", Flag: "🇪🇬", Capital: "Cairo", Language: "Arabic", Hello: "salaam", Thanks: "shukran", Fact: "Ancient Egyptians used a toothpaste-like powder made with ingredients such as salt and mint.", Challenge: ChallengeFoodRemedy, Colors: []string{"#ce1126", "#ffffff", "#000000"}},
		{Code: "FR", Name: "France", Region: "Western Europe", Flag: "🇫🇷", Capital: "Paris", Language: "French", Hello: "bonjour", Thanks: "merci", Fact: "France has one of the world's densest networks of roundabouts.", Challenge: ChallengeQuickDraw, Colors: []string{"#0055a4", "#ffffff", "#ef4135"}},
		{Code: "AU", Name: "Australia", Region: "Oceania", Flag: "🇦🇺", Capital: "Canberra", Language: "English", Hello: "hello", Thanks: "thanks", Fact: "Australia has a large wild camel population descended from animals brought for desert transport.", Challenge: ChallengeQuickDraw, Colors: []string{"#00008b", "#ffffff", "#ff0000"}},
		{Code: "IT", Name: "Italy", Region: "Southern Europe", Flag: "🇮🇹", Capital: "Rome", Language: "Italian", Hello: "ciao", Thanks: "grazie", Fact: "Italy has more UNESCO World Heritage Sites than any other country.", Challenge: ChallengeButton, Colors: []string{"#009246", "#ffffff", "#ce2b37"}},
		{Code: "IN", Name: "India", Region: "South Asia", Flag: "🇮🇳", Capital: "New Delhi", Language: "Hindi", Hello: "namaste", Thanks: "dhanyavaad", Fact: "India has a floating post office on Dal Lake in Kashmir.", Challenge: ChallengePalette, Colors: []string{"#ff9933", "#ffffff", "#138808"}},
		{Code: "KR", Name: "South Korea", Region: "East Asia", Flag: "🇰🇷", Capital: "Seoul", Language: "Korean", Hello: "annyeonghaseyo", Thanks: "gamsahamnida", Fact: "Seoul's subway system includes numbered stations and extensive underground shopping corridors.", Challenge: ChallengeQuickDraw, Colors: []string{"#ffffff", "#c60c30", "#003478"}},
		{Code: "MX", Name: "Mexico", Region: "North America", Flag: "🇲🇽", Capital: "Mexico City", Language: "Spanish", Hello: "hola", Thanks: "gracias", Fact: "Mexico City was built on the site of Tenochtitlan, an island city in Lake Texcoco.", Challenge: ChallengeFoodRemedy, Colors: []string{"#006847", "#ffffff", "#ce1126"}},
		{Code: "MA", Name: "Morocco", Region: "North Africa", Flag: "🇲🇦", Capital: "Rabat", Language: "Arabic", Hello: "salaam", Thanks: "shukran", Fact: "Morocco's city of Fez is home to one of the world's oldest continuously operating universities.", Challenge: ChallengePalette, Colors: []string{"#c1272d", "#006233"}},
		{Code: "CA", Name: "Canada", Region: "North America", Flag: "🇨🇦", Capital: "Ottawa", Language: "English and French", Hello: "hello", Thanks: "merci", Fact: "Canada has the longest coastline of any country on Earth.", Challenge: ChallengeButton, Colors: []string{"#ff0000", "#ffffff"}},
		{Code: "GH", Name: "Ghana", Region: "West Africa", Flag: "🇬🇭", Capital: "Accra", Language: "English", Hello: "hello", Thanks: "thank you", Fact: "Ghana's Lake Volta is one of the world's largest artificial lakes by surface area.", Challenge: ChallengeFoodRemedy, Colors: []string{"#ce1126", "#fcd116", "#006b3f"}},
		{Code: "KE", Name: "Kenya", Region: "East Africa", Flag: "🇰🇪", Capital: "Nairobi", Language: "Swahili", Hello: "jambo", Thanks: "asante", Fact: "Kenya's Great Rift Valley contains some of the earliest known human ancestor fossils.", Challenge: ChallengeQuickDraw, Colors: []string{"#000000", "#bb0000", "#006600"}},
		{Code: "NO", Name: "Norway", Region: "Northern Europe", Flag: "🇳🇴", Capital: "Oslo", Language: "Norwegian", Hello: "hei", Thanks: "takk", Fact: "Norway's fjords were carved by glaciers over thousands of years.", Challenge: ChallengePalette, Colors: []string{"#ba0c2f", "#ffffff", "#00205b"}},
		{Code: "PE", Name: "Peru", Region: "South America", Flag: "🇵🇪", Capital: "Lima", Language: "Spanish", Hello: "hola", Thanks: "gracias", Fact: "Peru is home to Machu Picchu, a mountain citadel built by the Inca.", Challenge: ChallengeButton, Colors: []string{"#d91023", "#ffffff"}},
		{Code: "TR", Name: "Turkey", Region: "West Asia", Flag: "🇹🇷", Capital: "Ankara", Language: "Turkish", Hello: "merhaba", Thanks: "teşekkürler", Fact: "Istanbul is the only major city that spans two continents.", Challenge: ChallengeQuickDraw, Colors: []string{"#e30a17", "#ffffff"}},
		{Code: "VN", Name: "Vietnam", Region: "Southeast Asia", Flag: "🇻🇳", Capital: "Hanoi", Language: "Vietnamese", Hello: "xin chào", Thanks: "cảm ơn", Fact: "Vietnam's Sơn Đoòng Cave is among the largest known caves in the world.", Challenge: ChallengePalette, Colors: []string{"#da251d", "#ffcd00"}},
		{Code: "GR", Name: "Greece", Region: "Southern Europe", Flag: "🇬🇷", Capital: "Athens", Language: "Greek", Hello: "yasou", Thanks: "efharisto", Fact: "Greece has thousands of islands, though only a fraction are inhabited.", Challenge: ChallengeFoodRemedy, Colors: []string{"#0d5eaf", "#ffffff"}},
		{Code: "JM", Name: "Jamaica", Region: "Caribbean", Flag: "🇯🇲", Capital: "Kingston", Language: "English", Hello: "hello", Thanks: "thank you", Fact: "Jamaica has won an outsized number of Olympic sprint medals for its population.", Challenge: ChallengeQuickDraw, Colors: []string{"#009b3a", "#fed100", "#000000"}},
		{Code: "NZ", Name: "New Zealand", Region: "Oceania", Flag: "🇳🇿", Capital: "Wellington", Language: "English and Māori", Hello: "kia ora", Thanks: "thank you", Fact: "New Zealand was the first self-governing country to grant women the right to vote.", Challenge: ChallengeButton, Colors: []string{"#00247d", "#ffffff", "#cc142b"}},
		{Code: "PT", Name: "Portugal", Region: "Southern Europe", Flag: "🇵🇹", Capital: "Lisbon", Language: "Portuguese", Hello: "olá", Thanks: "obrigado", Fact: "Portugal's Livraria Bertrand is often cited as the world's oldest operating bookstore.", Challenge: ChallengePalette, Colors: []string{"#006600", "#ff0000"}},
		{Code: "TH", Name: "Thailand", Region: "Southeast Asia", Flag: "🇹🇭", Capital: "Bangkok", Language: "Thai", Hello: "sawasdee", Thanks: "khop khun", Fact: "Bangkok's ceremonial full name is one of the longest place names in the world.", Challenge: ChallengeFoodRemedy, Colors: []string{"#a51931", "#ffffff", "#2d2a4a"}},
		{Code: "AR", Name: "Argentina", Region: "South America", Flag: "🇦🇷", Capital: "Buenos Aires", Language: "Spanish", Hello: "hola", Thanks: "gracias", Fact: "Argentina's Perito Moreno Glacier is one of the few large glaciers that has remained relatively stable in recent decades.", Challenge: ChallengeButton, Colors: []string{"#74acdf", "#ffffff", "#f6b40e"}},
		{Code: "IE", Name: "Ireland", Region: "Northern Europe", Flag: "🇮🇪", Capital: "Dublin", Language: "Irish and English", Hello: "dia dhuit", Thanks: "go raibh maith agat", Fact: "Ireland has no native snakes, a fact wrapped into the legend of Saint Patrick.", Challenge: ChallengeQuickDraw, Colors: []string{"#169b62", "#ffffff", "#ff883e"}},
		{Code: "ID", Name: "Indonesia", Region: "Southeast Asia", Flag: "🇮🇩", Capital: "Jakarta", Language: "Indonesian", Hello: "halo", Thanks: "terima kasih", Fact: "Indonesia is made up of more than 17,000 islands.", Challenge: ChallengePalette, Colors: []string{"#ff0000", "#ffffff"}},
		{Code: "ZA", Name: "South Africa", Region: "Southern Africa", Flag: "🇿🇦", Capital: "Pretoria", Language: "Multiple official languages", Hello: "sawubona", Thanks: "thank you", Fact: "South Africa has 12 official languages, including South African Sign Language.", Challenge: ChallengeFoodRemedy, Colors: []string{"#007a4d", "#ffb612", "#de3831", "#002395"}},
		{Code: "IS", Name: "Iceland", Region: "Northern Europe", Flag: "🇮🇸", Capital: "Reykjavík", Language: "Icelandic", Hello: "halló", Thanks: "takk", Fact: "Iceland sits on the Mid-Atlantic Ridge, where two tectonic plates pull apart.", Challenge: ChallengeButton, Colors: []string{"#02529c", "#ffffff", "#dc1e35"}},
		{Code: "PH", Name: "Philippines", Region: "Southeast Asia", Flag: "🇵🇭", Capital: "Manila", Language: "Filipino and English", Hello: "kumusta", Thanks: "salamat", Fact: "The Philippines has more than 7,000 islands.", Challenge: ChallengeQuickDraw, Colors: []string{"#0038a8", "#ce1126", "#fcd116"}},
		{Code: "ES", Name: "Spain", Region: "Southern Europe", Flag: "🇪🇸", Capital: "Madrid", Language: "Spanish", Hello: "hola", Thanks: "gracias", Fact: "Spain's La Tomatina festival turns a town into a giant tomato fight each year.", Challenge: ChallengePalette, Colors: []string{"#aa151b", "#f1bf00"}},
		{Code: "SN", Name: "Senegal", Region: "West Africa", Flag: "🇸🇳", Capital: "Dakar", Language: "French", Hello: "bonjour", Thanks: "merci", Fact: "Senegal's Lake Retba can appear pink because of salt-loving microorganisms.", Challenge: ChallengeFoodRemedy, Colors: []string{"#00853f", "#fdef42", "#e31b23"}},
	}

	out := make([]Destination, 0, len(rows))
	for _, row := range rows {
		out = append(out, makeDestination(row))
	}
	return out
}

func DestinationForDate(destinations []Destination, date time.Time) Destination {
	if len(destinations) == 0 {
		return Destination{}
	}
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	days := int(date.UTC().Truncate(24*time.Hour).Sub(start) / (24 * time.Hour))
	if days < 0 {
		days = -days
	}
	return destinations[days%len(destinations)]
}

func makeDestination(seed destinationSeed) Destination {
	return Destination{
		CountryCode: seed.Code,
		CountryName: seed.Name,
		Region: seed.Region,
		FlagEmoji: seed.Flag,
		DailyFact: seed.Fact,
		DeepDiveFacts: []string{
			seed.Fact,
			seed.Name + " is in " + seed.Region + ".",
			seed.Capital + " is the capital of " + seed.Name + ".",
			seed.Language + " is one of the languages connected to " + seed.Name + ".",
			"A greeting to remember: " + seed.Hello + ".",
			"A thank-you phrase to remember: " + seed.Thanks + ".",
		},
		QuizCulture: []QuizQuestion{
			question("What is the capital of "+seed.Name+"?", []string{seed.Capital, "Tokyo", "Cairo", "Lima"}, 0),
			question(seed.Name+" is in which region?", []string{seed.Region, "East Asia", "West Africa", "Oceania"}, 0),
			question("Which country did today's fact unlock?", []string{seed.Name, "France", "Kenya", "Mexico"}, 0),
		},
		QuizLanguage: []QuizQuestion{
			question("In "+seed.Name+", what does this greeting mean: "+seed.Hello+"?", []string{"Hello", "Goodbye", "Water", "Night"}, 0),
			question("In "+seed.Name+", what does this phrase mean: "+seed.Thanks+"?", []string{"Thank you", "Please", "Left", "Tomorrow"}, 0),
			question("Which language is connected to "+seed.Name+" in today's card?", []string{seed.Language, "Japanese", "Portuguese", "Swahili"}, 0),
		},
		ChallengeType: seed.Challenge,
		ChallengeParams: map[string]any{"theme": "country_unlock", "colors": seed.Colors, "prompt": "Unlock " + seed.Name + " for today's atlas."},
		ScoreThreshold: 700,
		Active: true,
	}
}

func question(text string, options []string, correct int) QuizQuestion {
	return QuizQuestion{Question: text, Options: options, CorrectIndex: correct}
}
```

- [ ] **Step 4: Run tests**

```bash
go test ./internal/expedition
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/internal/expedition/seed.go server/internal/expedition/service_test.go
git commit -m "feat: seed daily expedition countries"
```

---

## Task 4: Store Types and Repository Methods

**Files:**
- Modify: `server/internal/store/store.go`
- Create: `server/internal/store/expedition.go`

- [ ] **Step 1: Add store structs and interface methods**

In `server/internal/store/store.go`, add these structs above `Repository`:

```go
type ExpeditionDestination struct {
	CountryCode     string         `json:"country_code"`
	CountryName     string         `json:"country_name"`
	Region          string         `json:"region"`
	FlagEmoji       string         `json:"flag_emoji"`
	DailyFact       string         `json:"daily_fact"`
	DeepDiveFacts   []byte         `json:"deep_dive_facts"`
	QuizCulture     []byte         `json:"quiz_culture"`
	QuizLanguage    []byte         `json:"quiz_language"`
	ChallengeType   string         `json:"challenge_type"`
	ChallengeParams []byte         `json:"challenge_params"`
	ScoreThreshold  int            `json:"score_threshold"`
	Active          bool           `json:"active"`
	CreatedAt       time.Time      `json:"created_at"`
}

type ExpeditionAtlasEntry struct {
	UserID             string    `json:"user_id"`
	CountryCode        string    `json:"country_code"`
	DiscoveredDate     time.Time `json:"discovered_date"`
	ExpeditionScore    int       `json:"expedition_score"`
	QuizCultureScore   int       `json:"quiz_culture_score"`
	QuizLanguageScore  int       `json:"quiz_language_score"`
	TotalScore         int       `json:"total_score"`
	StreakShieldEarned bool      `json:"streak_shield_earned"`
}

type ExpeditionStreak struct {
	UserID         string     `json:"user_id"`
	CurrentStreak  int        `json:"current_streak"`
	LongestStreak  int        `json:"longest_streak"`
	LastPlayedDate *time.Time `json:"last_played_date"`
	StreakShields  int        `json:"streak_shields"`
	ActiveRewards  []byte     `json:"active_rewards"`
}
```

Add these methods under the `DailyPuzzles` section or a new `Expeditions` section:

```go
SeedExpeditionDestinations(ctx context.Context, destinations []ExpeditionDestination) error
ListExpeditionDestinations(ctx context.Context) ([]ExpeditionDestination, error)
GetExpeditionDestination(ctx context.Context, countryCode string) (*ExpeditionDestination, error)
GetExpeditionAtlasEntry(ctx context.Context, userID, countryCode string) (*ExpeditionAtlasEntry, error)
UpsertExpeditionAtlasEntry(ctx context.Context, entry ExpeditionAtlasEntry) error
ListExpeditionAtlas(ctx context.Context, userID string) ([]ExpeditionAtlasEntry, error)
GetExpeditionStreak(ctx context.Context, userID string) (*ExpeditionStreak, error)
UpsertExpeditionStreak(ctx context.Context, streak ExpeditionStreak) error
UpsertExpeditionDailyScore(ctx context.Context, date time.Time, userID, countryCode string, expeditionScore, quizScore, totalScore int) error
ListExpeditionDailyScores(ctx context.Context, date time.Time, limit int) ([]ExpeditionAtlasEntry, error)
```

- [ ] **Step 2: Implement repository methods**

Create `server/internal/store/expedition.go`:

```go
package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *PgStore) SeedExpeditionDestinations(ctx context.Context, destinations []ExpeditionDestination) error {
	for _, d := range destinations {
		_, err := s.pool.Exec(ctx, `
			INSERT INTO daily_expedition_destinations (
				country_code, country_name, region, flag_emoji, daily_fact,
				deep_dive_facts, quiz_culture, quiz_language, challenge_type,
				challenge_params, score_threshold, active
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
			ON CONFLICT (country_code) DO UPDATE SET
				country_name = EXCLUDED.country_name,
				region = EXCLUDED.region,
				flag_emoji = EXCLUDED.flag_emoji,
				daily_fact = EXCLUDED.daily_fact,
				deep_dive_facts = EXCLUDED.deep_dive_facts,
				quiz_culture = EXCLUDED.quiz_culture,
				quiz_language = EXCLUDED.quiz_language,
				challenge_type = EXCLUDED.challenge_type,
				challenge_params = EXCLUDED.challenge_params,
				score_threshold = EXCLUDED.score_threshold,
				active = EXCLUDED.active
		`, d.CountryCode, d.CountryName, d.Region, d.FlagEmoji, d.DailyFact, d.DeepDiveFacts, d.QuizCulture, d.QuizLanguage, d.ChallengeType, d.ChallengeParams, d.ScoreThreshold, d.Active)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *PgStore) ListExpeditionDestinations(ctx context.Context) ([]ExpeditionDestination, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT country_code, country_name, region, flag_emoji, daily_fact, deep_dive_facts,
		       quiz_culture, quiz_language, challenge_type, challenge_params, score_threshold, active, created_at
		FROM daily_expedition_destinations
		WHERE active = true
		ORDER BY country_code
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ExpeditionDestination{}
	for rows.Next() {
		d, err := scanExpeditionDestination(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *d)
	}
	return out, rows.Err()
}

func (s *PgStore) GetExpeditionDestination(ctx context.Context, countryCode string) (*ExpeditionDestination, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT country_code, country_name, region, flag_emoji, daily_fact, deep_dive_facts,
		       quiz_culture, quiz_language, challenge_type, challenge_params, score_threshold, active, created_at
		FROM daily_expedition_destinations
		WHERE country_code = $1 AND active = true
	`, countryCode)
	return scanExpeditionDestination(row)
}

func scanExpeditionDestination(row pgx.Row) (*ExpeditionDestination, error) {
	var d ExpeditionDestination
	err := row.Scan(&d.CountryCode, &d.CountryName, &d.Region, &d.FlagEmoji, &d.DailyFact, &d.DeepDiveFacts, &d.QuizCulture, &d.QuizLanguage, &d.ChallengeType, &d.ChallengeParams, &d.ScoreThreshold, &d.Active, &d.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *PgStore) GetExpeditionAtlasEntry(ctx context.Context, userID, countryCode string) (*ExpeditionAtlasEntry, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT user_id, country_code, discovered_date, expedition_score, quiz_culture_score,
		       quiz_language_score, total_score, streak_shield_earned
		FROM user_expedition_atlas
		WHERE user_id = $1 AND country_code = $2
	`, userID, countryCode)
	entry, err := scanExpeditionAtlasEntry(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return entry, err
}

func (s *PgStore) UpsertExpeditionAtlasEntry(ctx context.Context, entry ExpeditionAtlasEntry) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO user_expedition_atlas (
			user_id, country_code, discovered_date, expedition_score, quiz_culture_score,
			quiz_language_score, total_score, streak_shield_earned
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (user_id, country_code) DO UPDATE SET
			expedition_score = GREATEST(user_expedition_atlas.expedition_score, EXCLUDED.expedition_score),
			quiz_culture_score = GREATEST(user_expedition_atlas.quiz_culture_score, EXCLUDED.quiz_culture_score),
			quiz_language_score = GREATEST(user_expedition_atlas.quiz_language_score, EXCLUDED.quiz_language_score),
			total_score = GREATEST(user_expedition_atlas.total_score, EXCLUDED.total_score),
			streak_shield_earned = user_expedition_atlas.streak_shield_earned OR EXCLUDED.streak_shield_earned,
			updated_at = now()
	`, entry.UserID, entry.CountryCode, entry.DiscoveredDate, entry.ExpeditionScore, entry.QuizCultureScore, entry.QuizLanguageScore, entry.TotalScore, entry.StreakShieldEarned)
	return err
}
```

Continue `server/internal/store/expedition.go` with these methods:

```go
func scanExpeditionAtlasEntry(row pgx.Row) (*ExpeditionAtlasEntry, error) {
	var entry ExpeditionAtlasEntry
	err := row.Scan(&entry.UserID, &entry.CountryCode, &entry.DiscoveredDate, &entry.ExpeditionScore, &entry.QuizCultureScore, &entry.QuizLanguageScore, &entry.TotalScore, &entry.StreakShieldEarned)
	if err != nil {
		return nil, err
	}
	return &entry, nil
}

func (s *PgStore) ListExpeditionAtlas(ctx context.Context, userID string) ([]ExpeditionAtlasEntry, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT user_id, country_code, discovered_date, expedition_score, quiz_culture_score,
		       quiz_language_score, total_score, streak_shield_earned
		FROM user_expedition_atlas
		WHERE user_id = $1
		ORDER BY discovered_date DESC, country_code ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ExpeditionAtlasEntry{}
	for rows.Next() {
		entry, err := scanExpeditionAtlasEntry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *entry)
	}
	return out, rows.Err()
}

func (s *PgStore) GetExpeditionStreak(ctx context.Context, userID string) (*ExpeditionStreak, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT user_id, current_streak, longest_streak, last_played_date, streak_shields, active_rewards
		FROM user_expedition_streaks
		WHERE user_id = $1
	`, userID)
	var streak ExpeditionStreak
	err := row.Scan(&streak.UserID, &streak.CurrentStreak, &streak.LongestStreak, &streak.LastPlayedDate, &streak.StreakShields, &streak.ActiveRewards)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &streak, nil
}

func (s *PgStore) UpsertExpeditionStreak(ctx context.Context, streak ExpeditionStreak) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO user_expedition_streaks (user_id, current_streak, longest_streak, last_played_date, streak_shields, active_rewards)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (user_id) DO UPDATE SET
			current_streak = EXCLUDED.current_streak,
			longest_streak = GREATEST(user_expedition_streaks.longest_streak, EXCLUDED.longest_streak),
			last_played_date = EXCLUDED.last_played_date,
			streak_shields = LEAST(EXCLUDED.streak_shields, 3),
			active_rewards = EXCLUDED.active_rewards,
			updated_at = now()
	`, streak.UserID, streak.CurrentStreak, streak.LongestStreak, streak.LastPlayedDate, streak.StreakShields, streak.ActiveRewards)
	return err
}

func (s *PgStore) UpsertExpeditionDailyScore(ctx context.Context, date time.Time, userID, countryCode string, expeditionScore, quizScore, totalScore int) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO daily_expedition_scores (date, user_id, country_code, expedition_score, quiz_score, total_score)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (date, user_id) DO UPDATE SET
			expedition_score = GREATEST(daily_expedition_scores.expedition_score, EXCLUDED.expedition_score),
			quiz_score = GREATEST(daily_expedition_scores.quiz_score, EXCLUDED.quiz_score),
			total_score = GREATEST(daily_expedition_scores.total_score, EXCLUDED.total_score),
			completed_at = now()
	`, date, userID, countryCode, expeditionScore, quizScore, totalScore)
	return err
}

func (s *PgStore) ListExpeditionDailyScores(ctx context.Context, date time.Time, limit int) ([]ExpeditionAtlasEntry, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT user_id, country_code, date, expedition_score, 0, quiz_score, total_score, false
		FROM daily_expedition_scores
		WHERE date = $1
		ORDER BY total_score DESC
		LIMIT $2
	`, date, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ExpeditionAtlasEntry{}
	for rows.Next() {
		entry, err := scanExpeditionAtlasEntry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *entry)
	}
	return out, rows.Err()
}
```

- [ ] **Step 3: Run backend compile tests**

```bash
go test ./internal/store ./internal/expedition
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/internal/store/store.go server/internal/store/expedition.go
git commit -m "feat: add expedition repository methods"
```

---

## Task 5: Expedition Service

**Files:**
- Create: `server/internal/expedition/service.go`
- Modify: `server/internal/expedition/service_test.go`

- [ ] **Step 1: Add service behavior tests**

Add tests for:
- passing challenge score unlocks country.
- failing challenge score does not unlock country.
- perfect culture + language quizzes grants one shield, capped at 3.
- streak rewards update at 3, 7, 14, 30, 50.

Use a fake repository in the test file with in-memory maps. Keep the fake repository local to `service_test.go`.

- [ ] **Step 2: Implement service skeleton**

Create `server/internal/expedition/service.go`:

```go
package expedition

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"games.bammby.com/server/internal/cache"
	"games.bammby.com/server/internal/store"
)

type Repository interface {
	SeedExpeditionDestinations(ctx context.Context, destinations []store.ExpeditionDestination) error
	ListExpeditionDestinations(ctx context.Context) ([]store.ExpeditionDestination, error)
	GetExpeditionDestination(ctx context.Context, countryCode string) (*store.ExpeditionDestination, error)
	GetExpeditionAtlasEntry(ctx context.Context, userID, countryCode string) (*store.ExpeditionAtlasEntry, error)
	UpsertExpeditionAtlasEntry(ctx context.Context, entry store.ExpeditionAtlasEntry) error
	ListExpeditionAtlas(ctx context.Context, userID string) ([]store.ExpeditionAtlasEntry, error)
	GetExpeditionStreak(ctx context.Context, userID string) (*store.ExpeditionStreak, error)
	UpsertExpeditionStreak(ctx context.Context, streak store.ExpeditionStreak) error
	UpsertExpeditionDailyScore(ctx context.Context, date time.Time, userID, countryCode string, expeditionScore, quizScore, totalScore int) error
}

type Service struct {
	repo  Repository
	cache *cache.Cache
	now   func() time.Time
}

func NewService(repo Repository, c *cache.Cache) *Service {
	return &Service{repo: repo, cache: c, now: func() time.Time { return time.Now().UTC() }}
}

func (s *Service) SetNowForTest(now func() time.Time) {
	s.now = now
}

type TodayResponse struct {
	Date        string         `json:"date"`
	Destination map[string]any `json:"destination"`
	Status      map[string]any `json:"status"`
	Streak      map[string]any `json:"streak"`
	Atlas       map[string]any `json:"atlas"`
}

func (s *Service) Today(ctx context.Context, userID string) (*TodayResponse, error) {
	destinations, err := s.repo.ListExpeditionDestinations(ctx)
	if err != nil {
		return nil, err
	}
	if len(destinations) == 0 {
		return nil, errors.New("no expedition destinations")
	}
	today := s.now().UTC()
	destination := destinations[int(today.Sub(time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))/(24*time.Hour))%len(destinations)]
	entry, err := s.repo.GetExpeditionAtlasEntry(ctx, userID, destination.CountryCode)
	if err != nil {
		return nil, err
	}
	streak, err := s.ensureStreak(ctx, userID)
	if err != nil {
		return nil, err
	}
	atlas, err := s.repo.ListExpeditionAtlas(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &TodayResponse{
		Date: DateKey(today),
		Destination: publicDestination(destination, entry != nil),
		Status: statusPayload(entry, today),
		Streak: streakPayload(streak),
		Atlas: map[string]any{"discovered": len(atlas), "total": len(destinations)},
	}, nil
}
```

- [ ] **Step 3: Implement completion and quiz methods**

Add methods:
- `Complete(ctx, userID string, req CompleteRequest) (map[string]any, error)`
- `SubmitQuiz(ctx, userID string, req QuizRequest) (map[string]any, error)`
- `Atlas(ctx, userID string) (map[string]any, error)`
- `Country(ctx, userID, countryCode string) (map[string]any, error)`
- `Leaderboard(ctx context.Context, date string, n int) (map[string]any, error)`

Key rules:
- Only today's country can be completed.
- `ScoreChallenge(req) >= destination.ScoreThreshold` unlocks.
- Quiz submission requires an unlocked atlas entry.
- Each quiz max is 300 points.
- Perfect culture + language total of 600 earns exactly one shield for that country.
- `streak_shields` is capped at 3.
- Completion writes Redis key `leaderboard:expedition:<date>` through existing `cache.LeaderboardKey("expedition", date)`.

- [ ] **Step 4: Run tests**

```bash
go test ./internal/expedition
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/internal/expedition/service.go server/internal/expedition/service_test.go
git commit -m "feat: add expedition service"
```

---

## Task 6: Expedition API Handlers and Routes

**Files:**
- Create: `server/internal/api/expedition.go`
- Modify: `server/internal/api/api.go`

- [ ] **Step 1: Add handler file**

Create `server/internal/api/expedition.go`:

```go
package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/expedition"
)

func (h *Handler) ExpeditionToday(w http.ResponseWriter, r *http.Request) {
	user, err := h.currentUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}
	payload, err := h.expeditionSvc.Today(r.Context(), user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) ExpeditionComplete(w http.ResponseWriter, r *http.Request) {
	user, err := h.currentUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}
	var req expedition.CompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request")
		return
	}
	payload, err := h.expeditionSvc.Complete(r.Context(), user.ID, req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) ExpeditionQuiz(w http.ResponseWriter, r *http.Request) {
	user, err := h.currentUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}
	var req expedition.QuizRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request")
		return
	}
	payload, err := h.expeditionSvc.SubmitQuiz(r.Context(), user.ID, req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) ExpeditionAtlas(w http.ResponseWriter, r *http.Request) {
	user, err := h.currentUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}
	payload, err := h.expeditionSvc.Atlas(r.Context(), user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) ExpeditionCountry(w http.ResponseWriter, r *http.Request) {
	user, err := h.currentUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}
	payload, err := h.expeditionSvc.Country(r.Context(), user.ID, chi.URLParam(r, "countryCode"))
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) ExpeditionLeaderboard(w http.ResponseWriter, r *http.Request) {
	date := chi.URLParam(r, "date")
	n := 20
	if q := r.URL.Query().Get("n"); q != "" {
		if parsed, err := strconv.Atoi(q); err == nil && parsed > 0 && parsed <= 100 {
			n = parsed
		}
	}
	payload, err := h.expeditionSvc.Leaderboard(r.Context(), date, n)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *Handler) currentUser(r *http.Request) (struct{ ID string }, error) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		return struct{ ID string }{}, err
	}
	return struct{ ID string }{ID: u.ID}, nil
}
```

- [ ] **Step 2: Wire service and routes**

Modify `server/internal/api/api.go`:

```go
import (
    ...
    "games.bammby.com/server/internal/expedition"
)
```

Add field to `Handler`:

```go
expeditionSvc *expedition.Service
```

In `NewHandler`, initialize:

```go
expeditionSvc: expedition.NewService(s, c),
```

Inside authenticated routes:

```go
r.Get("/expedition/today", h.ExpeditionToday)
r.Post("/expedition/complete", h.ExpeditionComplete)
r.Post("/expedition/quiz", h.ExpeditionQuiz)
r.Get("/expedition/leaderboard/{date}", h.ExpeditionLeaderboard)
r.Get("/atlas", h.ExpeditionAtlas)
r.Get("/atlas/{countryCode}", h.ExpeditionCountry)
```

- [ ] **Step 3: Run backend compile**

```bash
go test ./internal/api ./internal/expedition ./internal/store
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/internal/api/api.go server/internal/api/expedition.go
git commit -m "feat: expose expedition api"
```

---

## Task 7: Frontend API Types and Tests

**Files:**
- Create: `web/lib/expedition.ts`
- Create: `web/lib/expedition.test.ts`
- Modify: `web/package.json`

- [ ] **Step 1: Write frontend tests**

Create `web/lib/expedition.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExpeditionShareText,
  getExpeditionRewards,
  formatAtlasProgress,
} from "./expedition.ts";

test("formatAtlasProgress formats discovered countries", () => {
  assert.equal(formatAtlasProgress(12, 195), "12/195 discovered");
});

test("getExpeditionRewards returns threshold rewards", () => {
  assert.deepEqual(getExpeditionRewards(14), [
    "bronze_compass",
    "silver_map",
    "gold_accent",
  ]);
});

test("buildExpeditionShareText is concise and shareable", () => {
  const text = buildExpeditionShareText({
    countryName: "Japan",
    flagEmoji: "🇯🇵",
    dailyFact: "The Shinkansen's average delay is less than one minute.",
    score: 842,
    rank: 1247,
    streak: 7,
    discovered: 12,
    total: 195,
    url: "https://nugdeep.suya.surf",
  });
  assert.match(text, /Japan/);
  assert.match(text, /12\/195/);
  assert.match(text, /7-day streak/);
});
```

- [ ] **Step 2: Add script**

Modify `web/package.json` scripts:

```json
"test:expedition": "node --no-warnings --experimental-strip-types --test lib/expedition.test.ts"
```

- [ ] **Step 3: Implement frontend lib**

Create `web/lib/expedition.ts`:

```ts
import { apiFetch } from "@/lib/api";

export type ExpeditionReward =
  | "bronze_compass"
  | "silver_map"
  | "gold_accent"
  | "master_explorer"
  | "legendary_cartographer";

export type ExpeditionChallengeType =
  | "the_button"
  | "palette"
  | "quick_draw"
  | "food_remedy";

export interface ExpeditionDestination {
  country_code: string;
  country_name: string;
  region: string;
  flag_emoji: string;
  challenge_type: ExpeditionChallengeType;
  challenge_params: Record<string, unknown>;
  score_threshold: number;
  daily_fact?: string;
}

export interface ExpeditionTodayResponse {
  date: string;
  destination: ExpeditionDestination;
  status: {
    unlocked: boolean;
    completed_today: boolean;
    expedition_score: number;
    quiz_culture_score: number;
    quiz_language_score: number;
    total_score: number;
  };
  streak: {
    current_streak: number;
    longest_streak: number;
    streak_shields: number;
    active_rewards: ExpeditionReward[];
  };
  atlas: {
    discovered: number;
    total: number;
  };
}

export interface ExpeditionCompleteRequest {
  country_code: string;
  challenge_type: ExpeditionChallengeType;
  raw_score: number;
  duration_ms: number;
  accuracy: number;
}

export interface ExpeditionSharePayload {
  countryName: string;
  flagEmoji: string;
  dailyFact: string;
  score: number;
  rank?: number;
  streak: number;
  discovered: number;
  total: number;
  url: string;
}

export async function fetchTodayExpedition(token?: string | null): Promise<ExpeditionTodayResponse> {
  return apiFetch("/api/v1/expedition/today", { token });
}

export async function completeExpedition(token: string | null | undefined, body: ExpeditionCompleteRequest) {
  return apiFetch("/api/v1/expedition/complete", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function submitExpeditionQuiz(token: string | null | undefined, body: { country_code: string; quiz_type: "culture" | "language"; answers: number[] }) {
  return apiFetch("/api/v1/expedition/quiz", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchAtlas(token?: string | null) {
  return apiFetch("/api/v1/atlas", { token });
}

export function formatAtlasProgress(discovered: number, total: number): string {
  return `${discovered}/${total} discovered`;
}

export function getExpeditionRewards(streak: number): ExpeditionReward[] {
  const rewards: ExpeditionReward[] = [];
  if (streak >= 3) rewards.push("bronze_compass");
  if (streak >= 7) rewards.push("silver_map");
  if (streak >= 14) rewards.push("gold_accent");
  if (streak >= 30) rewards.push("master_explorer");
  if (streak >= 50) rewards.push("legendary_cartographer");
  return rewards;
}

export function buildExpeditionShareText(payload: ExpeditionSharePayload): string {
  const rank = payload.rank ? ` Rank #${payload.rank}.` : "";
  return `${payload.flagEmoji} I unlocked ${payload.countryName} on Nugdeep. ${payload.discovered}/${payload.total} found. ${payload.streak}-day streak.${rank}\n\n${payload.dailyFact}\n\nCan you unlock today's country? ${payload.url}`;
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:expedition
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/expedition.ts web/lib/expedition.test.ts web/package.json
git commit -m "feat: add expedition frontend client"
```

---

## Task 8: Expedition Route and UI Components

**Files:**
- Create: `web/app/expedition/page.tsx`
- Create: `web/components/expedition/ExpeditionChallenge.tsx`
- Create: `web/components/expedition/challenges/ButtonExpedition.tsx`
- Create: `web/components/expedition/challenges/PaletteExpedition.tsx`
- Create: `web/components/expedition/challenges/QuickDrawExpedition.tsx`
- Create: `web/components/expedition/challenges/FoodRemedyExpedition.tsx`
- Create: `web/components/expedition/ExpeditionReveal.tsx`
- Create: `web/components/expedition/ExpeditionQuiz.tsx`
- Create: `web/components/expedition/ShareCardText.tsx`

- [ ] **Step 1: Create the page shell**

Create `web/app/expedition/page.tsx` as a client route using `AuthProvider`, `useAuth`, `fetchTodayExpedition`, `completeExpedition`, and `submitExpeditionQuiz`.

State machine:

```ts
type ExpeditionPhase = "loading" | "challenge" | "reveal" | "culture_quiz" | "language_quiz" | "complete" | "error";
```

- [ ] **Step 2: Create challenge router**

`ExpeditionChallenge` receives `destination`, calls the matching themed component, and emits:

```ts
onComplete({ raw_score, duration_ms, accuracy })
```

- [ ] **Step 3: Implement four MVP challenge variants**

Minimum viable mechanics:
- Button: press once to start timer, press again to stop near generated target.
- Palette: show color sequence for 2 seconds, ask player to select colors in order.
- Quick Draw: show random decoys, then target word/icon, measure reaction.
- Food Remedy: one 4-option timed question from params.

Score each client-side for instant feedback, then submit to server. Treat server score as authoritative.

- [ ] **Step 4: Implement reveal and quiz screens**

Screens:
- Reveal: flag, country, fact, score, streak, CTA to quiz.
- Quiz: 3 timed multiple-choice questions for culture then language.
- Complete: share text, atlas CTA, lobby CTA.

- [ ] **Step 5: Run frontend verification**

```bash
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/app/expedition web/components/expedition
git commit -m "feat: add daily expedition flow"
```

---

## Task 9: Atlas Route

**Files:**
- Create: `web/app/atlas/page.tsx`
- Create: `web/components/expedition/AtlasGrid.tsx`

- [ ] **Step 1: Implement atlas page**

Use `AuthProvider`, `useAuth`, and `fetchAtlas`. States:
- loading
- error
- empty
- grid loaded

- [ ] **Step 2: Implement atlas grid**

Grid card fields:
- flag emoji if unlocked, `?` if locked.
- country name if unlocked, region teaser if locked.
- best score.
- quiz status.
- discovered date.

- [ ] **Step 3: Run verification**

```bash
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add web/app/atlas web/components/expedition/AtlasGrid.tsx
git commit -m "feat: add expedition atlas"
```

---

## Task 10: Home and Lobby Entry Points

**Files:**
- Create: `web/components/expedition/ExpeditionCard.tsx`
- Modify: `web/app/lobby/page.tsx`
- Modify: home entry component used by `web/app/page.tsx`

- [ ] **Step 1: Implement ExpeditionCard**

Props:

```ts
interface ExpeditionCardProps {
  status?: "loading" | "ready" | "complete";
  countryName?: string;
  flagEmoji?: string;
  region?: string;
  streak?: number;
  discovered?: number;
  total?: number;
}
```

Copy:
- Ready: "Today's destination is hiding. Prove your skill to reveal it."
- Complete: "Unlocked today. Deep dive or open your atlas."

- [ ] **Step 2: Add card to lobby**

Place card above the lobby step frame, keeping current matchmaking flow intact.

- [ ] **Step 3: Add card to home/arrival route**

If the current 3D arrival component owns CTAs, add a compact Expedition CTA there without changing 3D scene behavior.

- [ ] **Step 4: Run verification**

```bash
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/components/expedition/ExpeditionCard.tsx web/app/lobby/page.tsx web/app/page.tsx web/components/arrival
git commit -m "feat: surface daily expedition entry"
```

---

## Task 11: End-to-End Manual Verification

**Files:**
- No source changes unless bugs are found.

- [ ] **Step 1: Run backend tests**

```bash
go test ./...
```

Expected: PASS or known tests that require unavailable services are skipped.

- [ ] **Step 2: Run frontend tests**

```bash
npm run test:lobby
npm run test:expedition
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run app locally**

```bash
npm run dev
```

Expected: Next.js dev server starts.

- [ ] **Step 4: Manual browser flow**

Verify:
- `/expedition` loads today's teaser.
- Challenge can be completed.
- Unlock reveal shows hidden fact only after completion.
- Culture quiz works.
- Language quiz works.
- Share text includes country, fact, streak, atlas progress.
- `/atlas` shows unlocked country and locked countries.
- `/lobby` still reaches intent/game/activity/queue without Expedition regressions.

- [ ] **Step 5: Commit fixes or final checkpoint**

```bash
git status --short
git add <changed-files>
git commit -m "fix: polish daily expedition flow"
```

Only run the final commit if verification produces fixes.

---

## Task 12: Deployment Readiness

**Files:**
- No source changes unless deployment scripts need a small fix.

- [ ] **Step 1: Confirm migration order**

```bash
ls server/migrations | tail
```

Expected: `018_daily_expeditions.up.sql` and `.down.sql` appear after `017`.

- [ ] **Step 2: Build backend and frontend**

```bash
./build.sh
```

Expected: Go server and Next.js app build successfully.

- [ ] **Step 3: Prepare deployment checklist**

Before deploying:
- Confirm database migration will run.
- Confirm Redis is available for leaderboard caching.
- Confirm `NEXT_PUBLIC_API_URL` points to production API.
- Confirm no hidden fact is returned by `/api/v1/expedition/today` before unlock.
- Confirm daily destination seed data is inserted once on startup or through a seed command.

- [ ] **Step 4: Deploy using existing deployment process**

Use the existing deployment scripts established for this repo. Verify:
- `/health` returns OK.
- `/api/v1/expedition/today` returns authenticated response.
- `/expedition` renders.
- `/atlas` renders.

- [ ] **Step 5: Commit deployment notes if needed**

```bash
git add docs/superpowers/plans/2026-06-17-daily-expedition-implementation.md
git commit -m "docs: add daily expedition implementation plan"
```

---

## Testing Matrix

### Backend

```bash
go test ./internal/expedition
go test ./internal/store
go test ./internal/api
go test ./...
```

### Frontend

```bash
npm run test:expedition
npm run test:lobby
npm run typecheck
npm run build
```

### Manual UX

- New user can open expedition and understand the goal in under 5 seconds.
- Locked fact is not visible before successful completion.
- Unlock moment feels rewarding.
- Two quizzes are short and clearly tied to the country.
- Failed challenge is gentle and not blame-heavy.
- Atlas gives a reason to return.
- Share text is compact enough for social posts.

---

## Risk Controls

- Keep facts in seed data small and source-verifiable before launch.
- Do not add a map library in MVP.
- Do not use browser-local streaks; server is authoritative.
- Do not rely on client score alone for future anti-cheat; MVP clamps and validates score shape server-side.
- Do not mix expedition streak with existing puzzle streak.
- Do not block lobby matchmaking if expedition API fails.

---

## Self-Review

- Spec coverage: MVP covers daily destination, challenge, reveal fact, two quizzes, streak rewards, atlas, leaderboard, and share text.
- Scope check: Interactive map and image card are intentionally deferred because they are independent polish layers.
- Placeholder scan: No task depends on undefined product behavior; tasks define exact files, commands, and expected results.
- Type consistency: Backend uses `country_code`, `challenge_type`, `quiz_type`, and frontend mirrors those names.
