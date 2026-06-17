package game

import (
	"math/rand"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"
)

type Card struct {
	ID   string `json:"id"`
	Word string `json:"word"`
}

type WordCardPlayer struct {
	UserID           string `json:"user_id"`
	Hand             []Card `json:"hand"`
	Score            int    `json:"score"`
	RefillUsed       bool   `json:"refill_used"`
	CardsPlayed      int    `json:"cards_played"`
	RoundScore       int    `json:"round_score"`
	Streak           int    `json:"streak"`
	RoundsWon        int    `json:"rounds_won"`
	RoundPoints      int    `json:"round_points"`
}

type WordCardGame struct {
	ID          string          `json:"id"`
	PlayerA     *WordCardPlayer `json:"player_a"`
	PlayerB     *WordCardPlayer `json:"player_b"`
	CenterCard  *Card           `json:"center_card"`
	CurrentTurn string          `json:"current_turn"`
	TurnStarted time.Time       `json:"turn_started"`
	Round       int             `json:"round"`
	MaxCards    int             `json:"max_cards"`
	Status      string          `json:"status"` // "waiting" "playing" "round_end" "finished"
	WinnerID    *string         `json:"winner_id"`
	Deck        []Card          `json:"-"`
	mu          sync.Mutex
	wordSet     []string
	lastPlayWord string
}

const (
	MaxRounds      = 3
	RoundsToWin    = 2
	HandSize       = 10
	TurnTimeout    = 30 * time.Second
	StreakBonusAt  = 3
	StreakBonusPts = 1
)

func (c Card) SortedLetters() string {
	runes := []rune(strings.ToLower(c.Word))
	sort.Slice(runes, func(i, j int) bool { return runes[i] < runes[j] })
	var result strings.Builder
	for _, r := range runes {
		if unicode.IsLetter(r) {
			result.WriteRune(r)
		}
	}
	return result.String()
}

func (c Card) LetterSet() map[rune]int {
	counts := make(map[rune]int)
	for _, r := range strings.ToLower(c.Word) {
		if unicode.IsLetter(r) {
			counts[r]++
		}
	}
	return counts
}

func distinctCommonLetterCount(a, b Card) int {
	setA := a.LetterSet()
	setB := b.LetterSet()
	count := 0
	for r := range setA {
		if _, ok := setB[r]; ok {
			count++
		}
	}
	return count
}

func isExactLetterMatch(a, b Card) bool {
	return a.SortedLetters() == b.SortedLetters()
}

func lastVowelSuffix(s string) string {
	idx := -1
	runes := []rune(s)
	for i := len(runes) - 1; i >= 0; i-- {
		r := unicode.ToLower(runes[i])
		if r == 'a' || r == 'e' || r == 'i' || r == 'o' || r == 'u' || r == 'y' {
			idx = i
			break
		}
	}
	if idx < 0 {
		return s
	}
	return string(runes[idx:])
}

var commonRhymeEndings = []string{
	"ing", "ight", "ate", "ell", "all", "ock",
	"ake", "ime", "ine", "ore", "own", "ump", "unk", "ang", "ank",
	"ong", "ung", "ain", "ail", "air", "are", "ear", "eer", "eet", "eat",
	"ice", "ide", "ife", "ike", "ill", "ind", "ipe", "ite", "ive",
	"oat", "oke", "old", "ole", "one", "ood", "ool", "oom", "oon",
	"oop", "oot", "ope", "orn", "ose", "ost", "oud", "oup", "out",
	"oy", "ue", "ump", "un", "unk", "url", "urn", "ush", "ust",
}

func doRhyme(a, b Card) bool {
	wa := strings.ToLower(a.Word)
	wb := strings.ToLower(b.Word)
	if wa == wb {
		return false
	}
	suffixA := lastVowelSuffix(wa)
	suffixB := lastVowelSuffix(wb)
	if len(suffixA) >= 2 && len(suffixB) >= 2 && suffixA == suffixB {
		return true
	}
	for _, ending := range commonRhymeEndings {
		if strings.HasSuffix(wa, ending) && strings.HasSuffix(wb, ending) {
			return true
		}
	}
	return false
}

func isValidPlay(center, played Card) bool {
	if strings.ToLower(center.Word) == strings.ToLower(played.Word) {
		return false
	}
	if doRhyme(center, played) {
		return true
	}
	return distinctCommonLetterCount(center, played) >= 3
}

func calculatePoints(playedAt time.Time, turnStartedAt time.Time, isExactMatch bool, streak int) int {
	elapsed := playedAt.Sub(turnStartedAt)
	var basePoints int
	switch {
	case elapsed <= 5*time.Second:
		basePoints = 3
	case elapsed <= 20*time.Second:
		basePoints = 2
	default:
		basePoints = 1
	}
	if isExactMatch {
		basePoints++
	}
	if streak >= StreakBonusAt {
		basePoints += StreakBonusPts
	}
	if basePoints > 5 {
		basePoints = 5
	}
	return basePoints
}

var wordCardWords = []string{
	"light", "night", "sight", "fight", "might", "right", "tight", "bright",
	"eight", "weight", "freight", "height",
	"brain", "train", "grain", "chain", "plain", "stain", "sprain", "drain",
	"crane", "plane",
	"stone", "bone", "phone", "alone", "throne", "zone", "cone", "tone",
	"dream", "stream", "cream", "steam", "scream", "beam", "seam", "gleam",
	"flame", "blame", "frame", "game", "name", "same", "tame", "lame",
	"came", "fame",
	"break", "steak", "stake", "snake", "bake", "cake", "fake", "lake",
	"make", "rake", "take", "wake", "quake", "brake", "flake", "shake",
	"dance", "chance", "glance", "trance", "lance", "prance",
	"grace", "space", "trace", "face", "lace", "pace", "race",
	"green", "queen", "screen", "keen", "seen", "bean", "clean", "lean",
	"great", "treat", "threat", "beat", "feet", "meat", "seat", "heat",
	"neat", "wheat", "sweet", "sheet",
	"smile", "while", "mile", "pile", "tile", "file", "trial",
	"write", "bite", "kite", "site", "spite", "white", "quite", "polite",
	"bloom", "gloom", "doom", "room", "zoom", "boom", "loom",
	"moon", "soon", "noon", "spoon", "croon",
	"cool", "fool", "pool", "tool", "school", "stool",
	"bird", "word", "heard", "third", "herd",
	"burn", "turn", "learn", "churn",
	"fast", "last", "past", "vast", "blast", "cast",
	"find", "kind", "mind", "blind", "grind", "wind",
	"band", "hand", "land", "sand", "stand", "brand", "grand",
	"bold", "cold", "gold", "hold", "old", "sold", "told", "fold",
	"ball", "call", "fall", "hall", "mall", "tall", "wall", "small",
	"bell", "cell", "fell", "hell", "sell", "tell", "well",
	"yell", "spell", "smell", "dwell",
	"bill", "fill", "hill", "ill", "kill", "mill",
	"pill", "till", "will", "chill", "drill", "grill", "skill",
	"spill", "still", "thrill",
	"bump", "dump", "jump", "lump", "pump",
	"camp", "damp", "lamp", "ramp", "stamp", "clamp",
	"wing", "king", "ring", "sing", "thing", "bring", "cling",
	"fling", "spring", "sting", "string", "swing",
	"long", "song", "strong", "wrong", "along", "belong",
	"bank", "rank", "sank", "tank", "blank",
	"crank", "drank", "frank", "prank",
	"link", "sink", "wink", "blink", "brink",
	"drink", "shrink", "stink", "think",
	"dark", "mark", "park", "bark", "shark", "spark",
	"star", "car", "bar", "jar",
	"air", "fair", "hair", "pair", "chair", "stair",
	"bear", "care", "dare", "fear", "gear", "hear", "near",
	"rear", "tear", "year", "clear", "dear", "shear", "spear",
	"book", "cook", "hook", "look", "took", "brook",
	"good", "hood", "stood", "wood",
	"down", "town", "brown", "crown", "clown", "drown", "frown",
	"cat", "bat", "rat", "sat", "fat", "hat", "mat",
	"chat", "flat", "spat",
	"bed", "red", "led", "fed", "shed", "sled",
	"bread", "dread", "spread", "tread",
	"big", "dig", "fig", "pig", "wig",
	"dog", "fog", "hog", "log", "bog",
	"bug", "dug", "hug", "jug", "mug", "plug", "slug",
	"sun", "fun", "gun", "run", "bun",
	"win", "pin", "tin", "bin", "grin", "skin",
	"spin", "thin", "twin",
	"hop", "top", "stop", "drop", "crop", "flop",
	"shop",
	"tap", "cap", "gap", "lap", "map", "nap",
	"trap", "clap", "flap", "slap", "snap", "wrap",
	"sit", "bit", "fit", "hit", "kit", "lit", "pit",
	"spit", "slit",
	"hot", "pot", "lot", "cot", "dot", "got", "not", "plot",
	"spot", "trot",
	"cut", "hut", "nut", "rut", "shut",
	"arm", "farm", "harm", "charm",
	"corn", "horn", "born", "torn", "worn", "scorn",
	"thorn",
	"port", "fort", "sort", "short", "sport",
	"north", "worth",
	"edge", "hedge", "ledge", "pledge", "wedge",
	"judge", "fudge", "nudge", "trudge", "smudge",
	"bounce", "ounce", "pounce", "announce",
	"fence", "hence", "dense", "sense", "tense",
	"house", "mouse", "blouse", "spouse",
	"charge", "large", "barge",
	"bridge", "ridge", "fridge", "porridge",
}

func shuffleCards(cards []Card) {
	for i := len(cards) - 1; i > 0; i-- {
		j := rand.Intn(i + 1)
		cards[i], cards[j] = cards[j], cards[i]
	}
}

func dealHand(deck *[]Card, size int) []Card {
	hand := make([]Card, size)
	for i := 0; i < size && len(*deck) > 0; i++ {
		hand[i] = (*deck)[0]
		*deck = (*deck)[1:]
	}
	return hand
}

func NewWordCardGame(id, playerAID, playerBID string) *WordCardGame {
	words := make([]string, len(wordCardWords))
	copy(words, wordCardWords)
	rand.Shuffle(len(words), func(i, j int) { words[i], words[j] = words[j], words[i] })

	deck := make([]Card, len(words))
	for i, w := range words {
		deck[i] = Card{ID: id + "-d-" + strconv.Itoa(i), Word: w}
	}

	handA := make([]Card, HandSize)
	handB := make([]Card, HandSize)
	copy(handA, deck[:HandSize])
	copy(handB, deck[HandSize:2*HandSize])
	remaining := deck[2*HandSize:]
	shuffleCards(handA)
	shuffleCards(handB)

	centerIdx := len(words) - 1
	centerWord := words[centerIdx]

	wc := &WordCardGame{
		ID:     id,
		PlayerA: &WordCardPlayer{
			UserID: playerAID, Hand: handA, Score: 0, Streak: 0, RoundsWon: 0,
		},
		PlayerB: &WordCardPlayer{
			UserID: playerBID, Hand: handB, Score: 0, Streak: 0, RoundsWon: 0,
		},
		CenterCard:  &Card{ID: id + "-center", Word: centerWord},
		CurrentTurn: playerAID,
		TurnStarted: time.Now().UTC(),
		Round:       1,
		MaxCards:    HandSize,
		Status:      "playing",
		Deck:        remaining,
		wordSet:     words,
	}

	for i, w := range words {
		wc.wordSet[i] = w
	}

	return wc
}

func (g *WordCardGame) startNewRound() {
	rand.Shuffle(len(g.wordSet), func(i, j int) {
		g.wordSet[i], g.wordSet[j] = g.wordSet[j], g.wordSet[i]
	})

	allWords := make([]string, len(g.wordSet))
	copy(allWords, g.wordSet)

	deck := make([]Card, len(allWords))
	for i, w := range allWords {
		deck[i] = Card{ID: g.ID + "-r" + strconv.Itoa(g.Round) + "-" + strconv.Itoa(i), Word: w}
	}

	handA := make([]Card, HandSize)
	handB := make([]Card, HandSize)
	copy(handA, deck[:HandSize])
	copy(handB, deck[HandSize:2*HandSize])
	remaining := deck[2*HandSize:]
	shuffleCards(handA)
	shuffleCards(handB)

	centerIdx := len(allWords) - 1

	g.PlayerA.Hand = handA
	g.PlayerB.Hand = handB
	g.PlayerA.RefillUsed = false
	g.PlayerB.RefillUsed = false
	g.PlayerA.Streak = 0
	g.PlayerB.Streak = 0
	g.PlayerA.RoundPoints = 0
	g.PlayerB.RoundPoints = 0
	g.CenterCard = &Card{ID: g.ID + "-center-r" + strconv.Itoa(g.Round), Word: allWords[centerIdx]}
	g.CurrentTurn = g.PlayerA.UserID
	g.TurnStarted = time.Now().UTC()
	g.Deck = remaining
	g.Status = "playing"
	g.lastPlayWord = ""
}

func (g *WordCardGame) PlayerByID(userID string) *WordCardPlayer {
	if g.PlayerA.UserID == userID {
		return g.PlayerA
	}
	if g.PlayerB.UserID == userID {
		return g.PlayerB
	}
	return nil
}

func (g *WordCardGame) OpponentOf(userID string) *WordCardPlayer {
	if g.PlayerA.UserID == userID {
		return g.PlayerB
	}
	if g.PlayerB.UserID == userID {
		return g.PlayerA
	}
	return nil
}

type PlayResult struct {
	Valid         bool   `json:"valid"`
	Points        int    `json:"points"`
	ExactMatch    bool   `json:"exact_match"`
	StreakBonus   bool   `json:"streak_bonus"`
	Streak        int    `json:"streak"`
	NewCenter     *Card  `json:"new_center"`
	PlayedCard    *Card  `json:"played_card"`
	NextTurn      string `json:"next_turn"`
	GameOver      bool   `json:"game_over"`
	RoundOver     bool   `json:"round_over"`
	RoundWinnerID string `json:"round_winner_id,omitempty"`
	RoundPoints   int    `json:"round_points"`
	WinnerID      string `json:"winner_id,omitempty"`
	ErrorMessage  string `json:"error_message,omitempty"`
	RemainingHand []Card `json:"remaining_hand,omitempty"`
}

func (g *WordCardGame) PlayCard(playerID, cardID string, playedAt time.Time) *PlayResult {
	g.mu.Lock()
	defer g.mu.Unlock()

	result := &PlayResult{}

	if g.Status != "playing" {
		result.ErrorMessage = "game is not active"
		return result
	}
	if g.CurrentTurn != playerID {
		result.ErrorMessage = "not your turn"
		return result
	}

	elapsed := playedAt.Sub(g.TurnStarted)
	if elapsed > TurnTimeout {
		return g.handleTimeoutLocked(playerID, result)
	}

	player := g.PlayerByID(playerID)
	if player == nil {
		result.ErrorMessage = "player not found"
		return result
	}

	cardIdx := -1
	for i, c := range player.Hand {
		if c.ID == cardID {
			cardIdx = i
			break
		}
	}
	if cardIdx < 0 {
		result.ErrorMessage = "card not in hand"
		return result
	}

	playedCard := player.Hand[cardIdx]
	if !isValidPlay(*g.CenterCard, playedCard) {
		result.ErrorMessage = "card does not rhyme or share 3+ letters with center card"
		return result
	}

	exactMatch := isExactLetterMatch(*g.CenterCard, playedCard)
	streakBonus := player.Streak >= StreakBonusAt
	points := calculatePoints(playedAt, g.TurnStarted, exactMatch, player.Streak)
	if streakBonus {
		result.StreakBonus = true
	}

	player.Hand = append(player.Hand[:cardIdx], player.Hand[cardIdx+1:]...)
	player.Score += points
	player.RoundPoints += points
	player.CardsPlayed++
	player.RefillUsed = false
	player.Streak++

	g.lastPlayWord = playedCard.Word
	g.CenterCard = &playedCard
	g.CurrentTurn = g.OpponentOf(playerID).UserID
	g.TurnStarted = playedAt

	result.Valid = true
	result.Points = points
	result.ExactMatch = exactMatch
	result.Streak = player.Streak
	result.NewCenter = g.CenterCard
	result.PlayedCard = &playedCard
	result.NextTurn = g.CurrentTurn
	result.RemainingHand = player.Hand

	if len(player.Hand) == 0 && len(g.Deck) == 0 {
		return g.finishRoundLocked(player, result)
	}

	return result
}

func (g *WordCardGame) handleTimeoutLocked(playerID string, result *PlayResult) *PlayResult {
	opponent := g.OpponentOf(playerID)
	return g.finishRoundLocked(opponent, result)
}

func (g *WordCardGame) finishRoundLocked(roundWinner *WordCardPlayer, result *PlayResult) *PlayResult {
	roundWinner.RoundsWon++
	result.RoundOver = true
	result.RoundWinnerID = roundWinner.UserID
	result.RoundPoints = roundWinner.RoundPoints

	if roundWinner.RoundsWon >= RoundsToWin || g.Round >= MaxRounds {
		g.Status = "finished"
		g.WinnerID = &roundWinner.UserID
		result.GameOver = true
		result.WinnerID = roundWinner.UserID
	} else {
		g.Status = "round_end"
		g.Round++
	}

	return result
}

type RefillResult struct {
	Card      *Card  `json:"card,omitempty"`
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
}

func (g *WordCardGame) RefillCard(playerID string) *RefillResult {
	g.mu.Lock()
	defer g.mu.Unlock()

	result := &RefillResult{}
	if g.Status != "playing" {
		result.Error = "game is not active"
		return result
	}
	if g.CurrentTurn != playerID {
		result.Error = "not your turn"
		return result
	}
	player := g.PlayerByID(playerID)
	if player == nil {
		result.Error = "player not found"
		return result
	}
	if player.RefillUsed {
		result.Error = "refill already used this turn"
		return result
	}
	if len(g.Deck) == 0 {
		result.Error = "deck is empty"
		return result
	}
	card := g.Deck[0]
	g.Deck = g.Deck[1:]
	player.Hand = append(player.Hand, card)
	player.RefillUsed = true
	result.Success = true
	result.Card = &card
	return result
}

func (g *WordCardGame) CheckTimeout() bool {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.Status != "playing" {
		return false
	}
	if time.Now().UTC().Sub(g.TurnStarted) > TurnTimeout {
		loserID := g.CurrentTurn
		winner := g.OpponentOf(loserID)
		winner.RoundsWon++
		if winner.RoundsWon >= RoundsToWin || g.Round >= MaxRounds {
			g.Status = "finished"
			g.WinnerID = &winner.UserID
		} else {
			g.Status = "round_end"
			g.Round++
		}
		return true
	}
	return false
}

func (g *WordCardGame) NextRound() bool {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.Status != "round_end" {
		return false
	}
	g.startNewRound()
	return true
}

type GameSnapshot struct {
	ID              string          `json:"id"`
	PlayerA         *WordCardPlayer `json:"player_a"`
	PlayerB         *WordCardPlayer `json:"player_b"`
	CenterCard      *Card           `json:"center_card"`
	CurrentTurn     string          `json:"current_turn"`
	TurnStarted     time.Time       `json:"turn_started"`
	Round           int             `json:"round"`
	RoundsToWin     int             `json:"rounds_to_win"`
	MaxCards        int             `json:"max_cards"`
	Status          string          `json:"status"`
	WinnerID        *string         `json:"winner_id"`
	TimeLeft        float64         `json:"time_left"`
}

func (g *WordCardGame) Snapshot() *GameSnapshot {
	g.mu.Lock()
	defer g.mu.Unlock()

	timeLeft := TurnTimeout.Seconds() - time.Now().UTC().Sub(g.TurnStarted).Seconds()
	if timeLeft < 0 {
		timeLeft = 0
	}

	pA := *g.PlayerA
	pB := *g.PlayerB

	return &GameSnapshot{
		ID:          g.ID,
		PlayerA:     &pA,
		PlayerB:     &pB,
		CenterCard:  g.CenterCard,
		CurrentTurn: g.CurrentTurn,
		TurnStarted: g.TurnStarted,
		Round:       g.Round,
		RoundsToWin: RoundsToWin,
		MaxCards:    g.MaxCards,
		Status:      g.Status,
		WinnerID:    g.WinnerID,
		TimeLeft:    timeLeft,
	}
}

func (g *WordCardGame) PlayerView(userID string) map[string]any {
	snap := g.Snapshot()
	player := g.PlayerByID(userID)
	opponent := g.OpponentOf(userID)

	return map[string]any{
		"id":           snap.ID,
		"center_card":  snap.CenterCard,
		"current_turn": snap.CurrentTurn,
		"round":        snap.Round,
		"rounds_to_win": snap.RoundsToWin,
		"max_cards":    snap.MaxCards,
		"status":       snap.Status,
		"winner_id":    snap.WinnerID,
		"time_left":    snap.TimeLeft,
		"my_score":     player.Score,
		"opponent_score": opponent.Score,
		"my_cards_played": player.CardsPlayed,
		"opponent_cards_played": opponent.CardsPlayed,
		"my_hand":      player.Hand,
		"opponent_hand_count": len(opponent.Hand),
		"my_turn":      g.CurrentTurn == userID,
		"deck_count":   len(g.Deck),
		"can_refill":   g.CurrentTurn == userID && !player.RefillUsed && len(g.Deck) > 0,
		"my_streak":    player.Streak,
		"opponent_streak": opponent.Streak,
		"my_rounds_won": player.RoundsWon,
		"opponent_rounds_won": opponent.RoundsWon,
		"last_play_word": g.lastPlayWord,
	}
}

type WordCardManager struct {
	mu    sync.RWMutex
	games map[string]*WordCardGame
}

func NewWordCardManager() *WordCardManager {
	return &WordCardManager{games: make(map[string]*WordCardGame)}
}

func (m *WordCardManager) Add(g *WordCardGame) {
	m.mu.Lock()
	m.games[g.ID] = g
	m.mu.Unlock()
}

func (m *WordCardManager) Get(id string) (*WordCardGame, bool) {
	m.mu.RLock()
	g, ok := m.games[id]
	m.mu.RUnlock()
	return g, ok
}

func (m *WordCardManager) Remove(id string) {
	m.mu.Lock()
	delete(m.games, id)
	m.mu.Unlock()
}

func (m *WordCardManager) All() []*WordCardGame {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*WordCardGame, 0, len(m.games))
	for _, g := range m.games {
		out = append(out, g)
	}
	return out
}

func (m *WordCardManager) StartCleanup(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now().UTC()
			m.mu.Lock()
			for id, g := range m.games {
				if g.Status == "finished" && now.Sub(g.TurnStarted) > 5*time.Minute {
					delete(m.games, id)
				}
			}
			m.mu.Unlock()
		}
	}()
}
