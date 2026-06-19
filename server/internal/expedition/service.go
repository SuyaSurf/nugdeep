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
	ListExpeditionDailyScores(ctx context.Context, date time.Time, limit int) ([]store.ExpeditionLeaderboardEntry, error)
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

func convertStoreDestinations(storeDests []store.ExpeditionDestination) []Destination {
	dests := make([]Destination, len(storeDests))
	for i, d := range storeDests {
		var deepDiveFacts []string
		json.Unmarshal(d.DeepDiveFacts, &deepDiveFacts)

		var quizCulture []QuizQuestion
		json.Unmarshal(d.QuizCulture, &quizCulture)

		var quizLanguage []QuizQuestion
		json.Unmarshal(d.QuizLanguage, &quizLanguage)

		var challengeParams map[string]any
		json.Unmarshal(d.ChallengeParams, &challengeParams)

		dests[i] = Destination{
			CountryCode:     d.CountryCode,
			CountryName:     d.CountryName,
			Region:          d.Region,
			FlagEmoji:       d.FlagEmoji,
			DailyFact:       d.DailyFact,
			DeepDiveFacts:   deepDiveFacts,
			QuizCulture:     quizCulture,
			QuizLanguage:    quizLanguage,
			ChallengeType:   ChallengeType(d.ChallengeType),
			ChallengeParams: challengeParams,
			ScoreThreshold:  d.ScoreThreshold,
			Active:          d.Active,
		}
	}
	return dests
}

type TodayResponse struct {
	Date        string         `json:"date"`
	Destination map[string]any `json:"destination"`
	Status      map[string]any `json:"status"`
	Streak      map[string]any `json:"streak"`
	Atlas       map[string]any `json:"atlas"`
}

func (s *Service) Today(ctx context.Context, userID string) (*TodayResponse, error) {
	storeDestinations, err := s.repo.ListExpeditionDestinations(ctx)
	if err != nil {
		return nil, err
	}
	if len(storeDestinations) == 0 {
		return nil, errors.New("no expedition destinations")
	}
	today := s.now().UTC()
	destinations := convertStoreDestinations(storeDestinations)
	destination := DestinationForDate(destinations, today)
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
		Date:        DateKey(today),
		Destination: publicDestination(destination, entry != nil),
		Status:      statusPayload(entry, today),
		Streak:      streakPayload(streak),
		Atlas:       map[string]any{"discovered": len(atlas), "total": len(destinations)},
	}, nil
}

type CompleteResponse struct {
	Unlocked        bool           `json:"unlocked"`
	CountryCode     string         `json:"country_code"`
	CountryName     string         `json:"country_name"`
	FlagEmoji       string         `json:"flag_emoji"`
	DailyFact       string         `json:"daily_fact"`
	ExpeditionScore int            `json:"expedition_score"`
	ScoreThreshold  int            `json:"score_threshold"`
	Streak          map[string]any `json:"streak"`
	LeaderboardRank int64          `json:"leaderboard_rank"`
}

func (s *Service) Complete(ctx context.Context, userID string, req CompleteRequest) (map[string]any, error) {
	storeDestinations, err := s.repo.ListExpeditionDestinations(ctx)
	if err != nil {
		return nil, err
	}
	today := s.now().UTC()
	destinations := convertStoreDestinations(storeDestinations)
	destination := DestinationForDate(destinations, today)

	if req.CountryCode != destination.CountryCode {
		return nil, errors.New("can only complete today's expedition")
	}

	score := ScoreChallenge(req)
	unlocked := score >= destination.ScoreThreshold

	streak, err := s.ensureStreak(ctx, userID)
	if err != nil {
		return nil, err
	}

	if unlocked {
		entry := store.ExpeditionAtlasEntry{
			UserID:             userID,
			CountryCode:        destination.CountryCode,
			DiscoveredDate:     today,
			ExpeditionScore:    score,
			QuizCultureScore:   0,
			QuizLanguageScore:  0,
			TotalScore:         score,
			StreakShieldEarned: false,
		}
		if err := s.repo.UpsertExpeditionAtlasEntry(ctx, entry); err != nil {
			return nil, err
		}

		streak = s.updateStreakForCompletion(streak, today)
		if err := s.repo.UpsertExpeditionStreak(ctx, *streak); err != nil {
			return nil, err
		}

		dateKey := DateKey(today)
		leaderboardKey := cache.LeaderboardKey("expedition", dateKey)
		if err := s.cache.LeaderboardAdd(ctx, leaderboardKey, float64(score), userID); err != nil {
			return nil, err
		}

		if err := s.repo.UpsertExpeditionDailyScore(ctx, today, userID, destination.CountryCode, score, 0, score); err != nil {
			return nil, err
		}

		rank, _ := s.cache.LeaderboardRank(ctx, leaderboardKey, userID)

		return map[string]any{
			"unlocked":         true,
			"country_code":     destination.CountryCode,
			"country_name":     destination.CountryName,
			"flag_emoji":       destination.FlagEmoji,
			"daily_fact":       destination.DailyFact,
			"expedition_score": score,
			"score_threshold":  destination.ScoreThreshold,
			"streak":           streakPayload(streak),
			"leaderboard_rank": rank + 1,
		}, nil
	}

	return map[string]any{
		"unlocked":         false,
		"country_code":     destination.CountryCode,
		"country_name":     destination.CountryName,
		"flag_emoji":       destination.FlagEmoji,
		"expedition_score": score,
		"score_threshold":  destination.ScoreThreshold,
		"streak":           streakPayload(streak),
	}, nil
}

type QuizResponse struct {
	QuizType           QuizType `json:"quiz_type"`
	Score              int      `json:"score"`
	Correct            int      `json:"correct"`
	Total              int      `json:"total"`
	StreakShieldEarned bool     `json:"streak_shield_earned"`
	DeepDiveFacts      []string `json:"deep_dive_facts"`
	TotalScore         int      `json:"total_score"`
}

func (s *Service) SubmitQuiz(ctx context.Context, userID string, req QuizRequest) (map[string]any, error) {
	destination, err := s.repo.GetExpeditionDestination(ctx, req.CountryCode)
	if err != nil {
		return nil, err
	}

	entry, err := s.repo.GetExpeditionAtlasEntry(ctx, userID, req.CountryCode)
	if err != nil || entry == nil {
		return nil, errors.New("country not unlocked")
	}

	var questions []QuizQuestion
	var scoreField *int
	if req.QuizType == QuizCulture {
		if err := json.Unmarshal(destination.QuizCulture, &questions); err != nil {
			return nil, err
		}
		scoreField = &entry.QuizCultureScore
	} else {
		if err := json.Unmarshal(destination.QuizLanguage, &questions); err != nil {
			return nil, err
		}
		scoreField = &entry.QuizLanguageScore
	}

	score, correct := ScoreQuiz(questions, req.Answers)
	*scoreField = score
	entry.TotalScore = entry.ExpeditionScore + entry.QuizCultureScore + entry.QuizLanguageScore

	streakShieldEarned := false
	if entry.QuizCultureScore >= 300 && entry.QuizLanguageScore >= 300 && !entry.StreakShieldEarned {
		entry.StreakShieldEarned = true
		streakShieldEarned = true

		streak, err := s.repo.GetExpeditionStreak(ctx, userID)
		if err != nil {
			return nil, err
		}
		if streak != nil && streak.StreakShields < 3 {
			streak.StreakShields++
			if err := s.repo.UpsertExpeditionStreak(ctx, *streak); err != nil {
				return nil, err
			}
		}
	}

	if err := s.repo.UpsertExpeditionAtlasEntry(ctx, *entry); err != nil {
		return nil, err
	}

	var deepDiveFacts []string
	if err := json.Unmarshal(destination.DeepDiveFacts, &deepDiveFacts); err != nil {
		deepDiveFacts = []string{}
	}

	today := s.now().UTC()
	if err := s.repo.UpsertExpeditionDailyScore(ctx, today, userID, req.CountryCode, entry.ExpeditionScore, entry.QuizCultureScore+entry.QuizLanguageScore, entry.TotalScore); err != nil {
		return nil, err
	}

	return map[string]any{
		"quiz_type":            req.QuizType,
		"score":                score,
		"correct":              correct,
		"total":                len(questions),
		"streak_shield_earned": streakShieldEarned,
		"deep_dive_facts":      deepDiveFacts,
		"total_score":          entry.TotalScore,
	}, nil
}

func (s *Service) Atlas(ctx context.Context, userID string) (map[string]any, error) {
	atlas, err := s.repo.ListExpeditionAtlas(ctx, userID)
	if err != nil {
		return nil, err
	}
	destinations, err := s.repo.ListExpeditionDestinations(ctx)
	if err != nil {
		return nil, err
	}

	entries := []map[string]any{}
	for _, entry := range atlas {
		dest, err := s.repo.GetExpeditionDestination(ctx, entry.CountryCode)
		if err != nil {
			continue
		}
		entries = append(entries, map[string]any{
			"country_code":         entry.CountryCode,
			"country_name":         dest.CountryName,
			"region":               dest.Region,
			"flag_emoji":           dest.FlagEmoji,
			"discovered_date":      entry.DiscoveredDate,
			"expedition_score":     entry.ExpeditionScore,
			"quiz_culture_score":   entry.QuizCultureScore,
			"quiz_language_score":  entry.QuizLanguageScore,
			"total_score":          entry.TotalScore,
			"streak_shield_earned": entry.StreakShieldEarned,
		})
	}

	locked := []map[string]any{}
	for _, dest := range destinations {
		found := false
		for _, entry := range atlas {
			if entry.CountryCode == dest.CountryCode {
				found = true
				break
			}
		}
		if !found {
			locked = append(locked, map[string]any{
				"country_code":   dest.CountryCode,
				"country_name":   dest.CountryName,
				"region":         dest.Region,
				"flag_emoji":     dest.FlagEmoji,
				"score_target":   dest.ScoreThreshold,
				"challenge_type": dest.ChallengeType,
			})
		}
	}

	return map[string]any{
		"unlocked": entries,
		"locked":   locked,
	}, nil
}

func (s *Service) Country(ctx context.Context, userID, countryCode string) (map[string]any, error) {
	dest, err := s.repo.GetExpeditionDestination(ctx, countryCode)
	if err != nil {
		return nil, err
	}

	entry, err := s.repo.GetExpeditionAtlasEntry(ctx, userID, countryCode)
	if err != nil {
		return nil, err
	}

	if entry == nil {
		return map[string]any{
			"country_code": dest.CountryCode,
			"country_name": dest.CountryName,
			"region":       dest.Region,
			"flag_emoji":   dest.FlagEmoji,
			"unlocked":     false,
		}, nil
	}

	var deepDiveFacts []string
	json.Unmarshal(dest.DeepDiveFacts, &deepDiveFacts)

	return map[string]any{
		"country_code":         dest.CountryCode,
		"country_name":         dest.CountryName,
		"region":               dest.Region,
		"flag_emoji":           dest.FlagEmoji,
		"daily_fact":           dest.DailyFact,
		"deep_dive_facts":      deepDiveFacts,
		"unlocked":             true,
		"discovered_date":      entry.DiscoveredDate,
		"expedition_score":     entry.ExpeditionScore,
		"quiz_culture_score":   entry.QuizCultureScore,
		"quiz_language_score":  entry.QuizLanguageScore,
		"total_score":          entry.TotalScore,
		"streak_shield_earned": entry.StreakShieldEarned,
	}, nil
}

func (s *Service) Leaderboard(ctx context.Context, date string, n int) (map[string]any, error) {
	parsedDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, err
	}

	scores, err := s.repo.ListExpeditionDailyScores(ctx, parsedDate, n)
	if err != nil {
		return nil, err
	}

	entries := []map[string]any{}
	for i, score := range scores {
		entries = append(entries, map[string]any{
			"rank":         i + 1,
			"user_id":      score.UserID,
			"country_code": score.CountryCode,
			"total_score":  score.TotalScore,
		})
	}

	return map[string]any{
		"date":    date,
		"entries": entries,
	}, nil
}

func (s *Service) ensureStreak(ctx context.Context, userID string) (*store.ExpeditionStreak, error) {
	streak, err := s.repo.GetExpeditionStreak(ctx, userID)
	if err != nil {
		return nil, err
	}
	if streak == nil {
		streak = &store.ExpeditionStreak{
			UserID:         userID,
			CurrentStreak:  0,
			LongestStreak:  0,
			LastPlayedDate: nil,
			StreakShields:  0,
			ActiveRewards:  []byte("[]"),
		}
	}
	return streak, nil
}

func (s *Service) updateStreakForCompletion(streak *store.ExpeditionStreak, today time.Time) *store.ExpeditionStreak {
	todayKey := DateKey(today)

	if streak.LastPlayedDate != nil {
		lastKey := DateKey(*streak.LastPlayedDate)
		yesterday := today.AddDate(0, 0, -1)
		yesterdayKey := DateKey(yesterday)

		if lastKey == todayKey {
			return streak
		}

		if lastKey == yesterdayKey {
			streak.CurrentStreak++
		} else if streak.StreakShields > 0 {
			streak.StreakShields--
		} else {
			streak.CurrentStreak = 1
		}
	} else {
		streak.CurrentStreak = 1
	}

	if streak.CurrentStreak > streak.LongestStreak {
		streak.LongestStreak = streak.CurrentStreak
	}

	streak.LastPlayedDate = &today

	rewards := RewardsForStreak(streak.CurrentStreak)
	rewardsJSON, _ := json.Marshal(rewards)
	streak.ActiveRewards = rewardsJSON

	return streak
}

func publicDestination(dest Destination, unlocked bool) map[string]any {
	if unlocked {
		return map[string]any{
			"country_code":     dest.CountryCode,
			"country_name":     dest.CountryName,
			"region":           dest.Region,
			"flag_emoji":       dest.FlagEmoji,
			"daily_fact":       dest.DailyFact,
			"deep_dive_facts":  dest.DeepDiveFacts,
			"quiz_culture":     publicQuizQuestions(dest.QuizCulture),
			"quiz_language":    publicQuizQuestions(dest.QuizLanguage),
			"challenge_type":   dest.ChallengeType,
			"challenge_params": dest.ChallengeParams,
			"score_threshold":  dest.ScoreThreshold,
		}
	}
	return map[string]any{
		"country_code":     dest.CountryCode,
		"country_name":     dest.CountryName,
		"region":           dest.Region,
		"flag_emoji":       dest.FlagEmoji,
		"challenge_type":   dest.ChallengeType,
		"challenge_params": dest.ChallengeParams,
		"score_threshold":  dest.ScoreThreshold,
	}
}

func publicQuizQuestions(questions []QuizQuestion) []PublicQuizQuestion {
	out := make([]PublicQuizQuestion, 0, len(questions))
	for _, question := range questions {
		out = append(out, PublicQuizQuestion{
			Question: question.Question,
			Options:  append([]string{}, question.Options...),
		})
	}
	return out
}

func statusPayload(entry *store.ExpeditionAtlasEntry, today time.Time) map[string]any {
	if entry == nil {
		return map[string]any{
			"unlocked":            false,
			"completed_today":     false,
			"expedition_score":    0,
			"quiz_culture_score":  0,
			"quiz_language_score": 0,
			"total_score":         0,
		}
	}
	return map[string]any{
		"unlocked":            true,
		"completed_today":     DateKey(entry.DiscoveredDate) == DateKey(today),
		"expedition_score":    entry.ExpeditionScore,
		"quiz_culture_score":  entry.QuizCultureScore,
		"quiz_language_score": entry.QuizLanguageScore,
		"total_score":         entry.TotalScore,
	}
}

func streakPayload(streak *store.ExpeditionStreak) map[string]any {
	if streak == nil {
		return map[string]any{
			"current_streak": 0,
			"longest_streak": 0,
			"streak_shields": 0,
			"active_rewards": []string{},
		}
	}
	var rewards []string
	json.Unmarshal(streak.ActiveRewards, &rewards)
	return map[string]any{
		"current_streak": streak.CurrentStreak,
		"longest_streak": streak.LongestStreak,
		"streak_shields": streak.StreakShields,
		"active_rewards": rewards,
	}
}
