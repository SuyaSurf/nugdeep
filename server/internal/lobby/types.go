package lobby

import "time"

type Intent string
type GameID string
type ActivityCode string

const (
	IntentSpeedDate Intent = "speed_date"
	IntentMakeFriend Intent = "make_friend"
	IntentJustPlay  Intent = "just_play"
)

type QueueEntry struct {
	UserID       string       `json:"user_id"`
	Intent       Intent       `json:"intent"`
	Game         GameID       `json:"game"`
	ActivityCode ActivityCode `json:"activity_code"`
	Choice       string       `json:"choice"`
	QueuedAt     time.Time    `json:"queued_at"`
}

type Match struct {
	ID           string       `json:"id"`
	PlayerA      string       `json:"player_a"`
	PlayerB      string       `json:"player_b"`
	Intent       Intent       `json:"intent"`
	Game         GameID       `json:"game"`
	ActivityCode ActivityCode `json:"activity_code"`
	Choice       string       `json:"choice"`
	State        string       `json:"state"`
	WinnerID     *string      `json:"winner_id"`
	LoserID      *string      `json:"loser_id"`
	CreatedAt    time.Time    `json:"created_at"`
}

type Location struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	ImageURL string `json:"image_url"`
}

type Activity struct {
	ID        int      `json:"id"`
	DayOfYear int      `json:"day_of_year"`
	Prompt    string   `json:"prompt"`
	Type      string   `json:"type"`
	Options   []Option `json:"options"`
}

type Option struct {
	Value string `json:"value"`
	Label string `json:"label"`
	Icon  string `json:"icon,omitempty"`
}

type QueueResponse struct {
	Status   string `json:"status"`
	MatchID  string `json:"match_id,omitempty"`
	QueuedAt int64  `json:"queued_at,omitempty"`
}

type LocationPickRequest struct {
	LocationIDs []string `json:"location_ids"`
}

type LocationChooseRequest struct {
	LocationID string `json:"location_id"`
}

type GameResultRequest struct {
	WinnerID string `json:"winner_id"`
}
