package store

import (
	"context"
	"time"
)

// Category is a seeded game category.
type Category struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// User is the platform user.
type User struct {
	ID                string     `json:"id"`
	ClerkID           string     `json:"clerk_id"`
	Username          string     `json:"username"`
	AgeBucket         string     `json:"age_bucket"`
	GenderIdentity    string     `json:"gender_identity"`
	LocationLabel     string     `json:"location_label"`
	Bio               string     `json:"bio"`
	Categories        []string   `json:"categories"`
	PuzzlesSolved     int        `json:"puzzles_solved"`
	Wins              int        `json:"wins"`
	Losses            int        `json:"losses"`
	Streak            int        `json:"streak"`
	LongestStreak     int        `json:"longest_streak"`
	HideCommunities   bool       `json:"hide_communities"`
	ShadowBannedUntil *time.Time `json:"shadow_banned_until"`
	DatingEligible    bool       `json:"dating_eligible"`
	EmailVerified     bool       `json:"email_verified"`
	PhoneVerified     bool       `json:"phone_verified"`
	CreatedAt         time.Time  `json:"created_at"`
	LastSolveAt       *time.Time `json:"last_solve_at"`
}

// PuzzleWord is one word in a puzzle set.
type PuzzleWord struct {
	Word            string   `json:"word"`
	CorrectCategory string   `json:"correct_category"`
	Decoys          []string `json:"decoys"`
}

// Puzzle is the puzzle definition (answers live server-side only).
type Puzzle struct {
	ID           string       `json:"id"`
	OwnerID      string       `json:"owner_id"`
	CategoryIDs  []string     `json:"category_ids"`
	Difficulty   int          `json:"difficulty"`
	TimerSeconds int          `json:"timer_seconds"`
	WordSet      []PuzzleWord `json:"word_set"`
	CreatedAt    time.Time    `json:"created_at"`
}

// Community is a hidden community gated by a puzzle.
type Community struct {
	ID          string     `json:"id"`
	Slug        string     `json:"slug"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Hint        string     `json:"hint"`
	IconURL     string     `json:"icon_url"`
	PuzzleID    string     `json:"puzzle_id"`
	MaxMembers  *int       `json:"max_members"`
	Hidden      bool       `json:"hidden"`
	BoostUntil  *time.Time `json:"boost_until"`
	CreatedAt   time.Time  `json:"created_at"`
}

// Membership ties a user to a community.
type Membership struct {
	ID          string    `json:"id"`
	CommunityID string    `json:"community_id"`
	UserID      string    `json:"user_id"`
	Role        string    `json:"role"`
	Via         string    `json:"via"`
	JoinedAt    time.Time `json:"joined_at"`
}

// UnlockCode is a one-time bypass code.
type UnlockCode struct {
	ID          string     `json:"id"`
	Code        string     `json:"code"`
	CommunityID string     `json:"community_id"`
	MintedBy    string     `json:"minted_by"`
	ExpiresAt   time.Time  `json:"expires_at"`
	UsedBy      *string    `json:"used_by"`
	UsedAt      *time.Time `json:"used_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

// GameSession tracks a single play attempt.
type GameSession struct {
	ID            string     `json:"id"`
	PuzzleID      string     `json:"puzzle_id"`
	UserID        string     `json:"user_id"`
	Context       string     `json:"context"`
	ContextID     *string    `json:"context_id"`
	StartedAt     time.Time  `json:"started_at"`
	Deadline      time.Time  `json:"deadline"`
	Progress      int        `json:"progress"`
	WrongCount    int        `json:"wrong_count"`
	LastCorrectAt *time.Time `json:"last_correct_at"`
	Result        string     `json:"result"`
	CreatedAt     time.Time  `json:"created_at"`
}

// Message is a chat message.
type Message struct {
	ID               string    `json:"id"`
	Scope            string    `json:"scope"`
	ScopeID          string    `json:"scope_id"`
	UserID           string    `json:"user_id"`
	Body             string    `json:"body"`
	ModerationStatus string    `json:"moderation_status"`
	CreatedAt        time.Time `json:"created_at"`
}

// Space is a 24h audio space inside a community.
type Space struct {
	ID              string    `json:"id"`
	CommunityID     string    `json:"community_id"`
	CreatorID       string    `json:"creator_id"`
	Name            string    `json:"name"`
	Topic           string    `json:"topic"`
	State           string    `json:"state"`
	SpeakingEnabled bool      `json:"speaking_enabled"`
	LivekitRoom     string    `json:"livekit_room"`
	OpensAt         time.Time `json:"opens_at"`
	ClosesAt        time.Time `json:"closes_at"`
	CreatedAt       time.Time `json:"created_at"`
}

// SpeakerRound tracks an open speaking turn in a space.
type SpeakerRound struct {
	ID       string     `json:"id"`
	SpaceID  string     `json:"space_id"`
	RoundNo  int        `json:"round_no"`
	OpenedAt time.Time  `json:"opened_at"`
	ClosedAt *time.Time `json:"closed_at"`
}

// SpeakRequest tracks a listener's request to speak.
type SpeakRequest struct {
	ID          string    `json:"id"`
	RoundID     string    `json:"round_id"`
	UserID      string    `json:"user_id"`
	RequestedAt time.Time `json:"requested_at"`
	Approved    bool      `json:"approved"`
}

// DateMatch tracks a speed-dating match.
type DateMatch struct {
	ID            string     `json:"id"`
	PlayerA       string     `json:"player_a"`
	PlayerB       string     `json:"player_b"`
	PuzzleID      *string    `json:"puzzle_id"`
	State         string     `json:"state"`
	WinnerID      *string    `json:"winner_id"`
	FirstMessage  *string    `json:"first_message"`
	RoomExpiresAt *time.Time `json:"room_expires_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// Referral tracks a user-to-user referral.
type Referral struct {
	ID            string    `json:"id"`
	ReferrerID    string    `json:"referrer_id"`
	ReferredID    string    `json:"referred_id"`
	RewardGranted bool      `json:"reward_granted"`
	CreatedAt     time.Time `json:"created_at"`
}

// Repository is the unified data interface.
type Repository interface {
	// Categories
	ListCategories(ctx context.Context) ([]Category, error)
	Ping(ctx context.Context) error

	// Users
	GetUserByClerkID(ctx context.Context, clerkID string) (*User, error)
	CreateUser(ctx context.Context, u *User) (*User, error)
	UpdateUser(ctx context.Context, u *User) error
	DeleteUser(ctx context.Context, id string) error
	GetUserByID(ctx context.Context, id string) (*User, error)
	GetUserByUsername(ctx context.Context, username string) (*User, error)
	ResetStreaksForInactiveUsers(ctx context.Context, cutoff time.Time) (int, error)
	PurgeInactiveUsers(ctx context.Context, before time.Time) (int, error)

	// Puzzles
	CreatePuzzle(ctx context.Context, p *Puzzle) (*Puzzle, error)
	GetPuzzleByID(ctx context.Context, id string) (*Puzzle, error)
	GetPuzzlesByOwner(ctx context.Context, ownerID string) ([]Puzzle, error)

	// Communities
	CreateCommunity(ctx context.Context, c *Community) (*Community, error)
	GetCommunityBySlug(ctx context.Context, slug string) (*Community, error)
	GetCommunityByID(ctx context.Context, id string) (*Community, error)
	ListCommunities(ctx context.Context, filter CommunityFilter) ([]Community, error)

	// Memberships
	CreateMembership(ctx context.Context, m *Membership) (*Membership, error)
	GetMembership(ctx context.Context, communityID, userID string) (*Membership, error)
	ListMembers(ctx context.Context, communityID string) ([]Membership, error)
	CountMembers(ctx context.Context, communityID string) (int, error)
	DeleteMembership(ctx context.Context, communityID, userID string) error
	UpdateMembershipRole(ctx context.Context, communityID, userID, role string) error
	GetCommunitiesByMember(ctx context.Context, userID string) ([]Community, error)

	// UnlockCodes
	CreateUnlockCode(ctx context.Context, uc *UnlockCode) (*UnlockCode, error)
	GetUnlockCode(ctx context.Context, code string) (*UnlockCode, error)
	RedeemUnlockCode(ctx context.Context, code, userID string) error

	// GameSessions
	CreateGameSession(ctx context.Context, s *GameSession) (*GameSession, error)
	GetGameSession(ctx context.Context, id string) (*GameSession, error)
	UpdateGameSessionResult(ctx context.Context, id, result string, progress int) error
	UpdateGameSessionStats(ctx context.Context, id, result string, progress, wrongCount int, lastCorrectAt *time.Time) error

	// Messages
	CreateMessage(ctx context.Context, m *Message) (*Message, error)
	ListMessages(ctx context.Context, scope, scopeID string, limit int) ([]Message, error)
	ListMessagesByUser(ctx context.Context, userID string, limit int) ([]Message, error)
	ListHeldMessages(ctx context.Context, limit int) ([]Message, error)

	// Spaces
	CreateSpace(ctx context.Context, sp *Space) (*Space, error)
	GetSpace(ctx context.Context, id string) (*Space, error)
	UpdateSpace(ctx context.Context, sp *Space) error
	ListSpacesByCommunity(ctx context.Context, communityID string) ([]Space, error)
	CloseExpiredSpaces(ctx context.Context) (int, error)

	// SpeakerRounds
	CreateSpeakerRound(ctx context.Context, sr *SpeakerRound) (*SpeakerRound, error)
	GetOpenRoundBySpace(ctx context.Context, spaceID string) (*SpeakerRound, error)
	CloseSpeakerRound(ctx context.Context, id string) error
	CountSpeakerRoundsBySpace(ctx context.Context, spaceID string) (int, error)

	// SpeakRequests
	CreateSpeakRequest(ctx context.Context, req *SpeakRequest) (*SpeakRequest, error)
	ListSpeakRequests(ctx context.Context, roundID string) ([]SpeakRequest, error)
	ApproveEarliestRequestIfUnderCap(ctx context.Context, roundID string, maxSpeakers int) (bool, error)
	RevokeSpeakerApproval(ctx context.Context, roundID, userID string) error

	// Dating
	CreateDateMatch(ctx context.Context, m *DateMatch) (*DateMatch, error)
	GetDateMatch(ctx context.Context, id string) (*DateMatch, error)
	GetDateMatchByPlayer(ctx context.Context, playerID string, states []string) (*DateMatch, error)
	UpdateDateMatch(ctx context.Context, m *DateMatch) error
	ListDateMatchesByPlayer(ctx context.Context, playerID string, limit int) ([]DateMatch, error)
	CountDailyMatches(ctx context.Context, playerID string, since time.Time) (int, error)
	ExpireStaleMatches(ctx context.Context, matchedTimeout, playingTimeout time.Duration) (int, error)
	FlipDecidedMatches(ctx context.Context) (int, error)
	ListFlippedMatches(ctx context.Context, limit int) ([]DateMatch, error)

	// DailyPuzzles
	SetDailyPuzzle(ctx context.Context, date time.Time, puzzleID string) error
	GetDailyPuzzle(ctx context.Context, date time.Time) (*Puzzle, error)

	// Referrals
	CreateReferral(ctx context.Context, referrerID, referredID string) (*Referral, error)
	CountReferralsByReferrer(ctx context.Context, referrerID string) (int, error)

	// Blocks / Reports
	CreateBlock(ctx context.Context, blockerID, targetID string) error
	IsBlocked(ctx context.Context, blockerID, targetID string) (bool, error)
	CreateReport(ctx context.Context, reporterID, targetID, messageID, reason string) error
	CountRecentReports(ctx context.Context, targetID string, since time.Time) (int, error)
	AutoShadowBan(ctx context.Context, threshold int, window time.Duration) (int, error)

	// Analytics
	CreateAnalyticsEvent(ctx context.Context, userID string, eventType string, properties map[string]any) error
}

// CommunityFilter filters community lists.
type CommunityFilter struct {
	Hidden   *bool
	Boosted  bool
	Category string
	Limit    int
}

// Ensure PgStore implements Repository.
var _ Repository = (*PgStore)(nil)
