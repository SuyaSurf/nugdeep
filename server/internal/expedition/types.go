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

type PublicQuizQuestion struct {
	Question string   `json:"question"`
	Options  []string `json:"options"`
}

type Destination struct {
	CountryCode     string         `json:"country_code"`
	CountryName     string         `json:"country_name"`
	Region          string         `json:"region"`
	FlagEmoji       string         `json:"flag_emoji"`
	DailyFact       string         `json:"daily_fact"`
	DeepDiveFacts   []string       `json:"deep_dive_facts"`
	QuizCulture     []QuizQuestion `json:"quiz_culture"`
	QuizLanguage    []QuizQuestion `json:"quiz_language"`
	ChallengeType   ChallengeType  `json:"challenge_type"`
	ChallengeParams map[string]any `json:"challenge_params"`
	ScoreThreshold  int            `json:"score_threshold"`
	Active          bool           `json:"active"`
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
