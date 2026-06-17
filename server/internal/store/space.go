package store

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *PgStore) CreateSpace(ctx context.Context, sp *Space) (*Space, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO spaces (community_id, creator_id, name, topic, state, speaking_enabled, livekit_room, opens_at, closes_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at
	`, sp.CommunityID, sp.CreatorID, sp.Name, sp.Topic, sp.State, sp.SpeakingEnabled, sp.LivekitRoom, sp.OpensAt, sp.ClosesAt)
	if err := row.Scan(&sp.ID, &sp.CreatedAt); err != nil {
		return nil, err
	}
	return sp, nil
}

func (s *PgStore) GetSpace(ctx context.Context, id string) (*Space, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, community_id, creator_id, name, topic, state, speaking_enabled, livekit_room, opens_at, closes_at, created_at
		FROM spaces WHERE id = $1
	`, id)
	var sp Space
	if err := row.Scan(&sp.ID, &sp.CommunityID, &sp.CreatorID, &sp.Name, &sp.Topic, &sp.State, &sp.SpeakingEnabled, &sp.LivekitRoom, &sp.OpensAt, &sp.ClosesAt, &sp.CreatedAt); err != nil {
		return nil, err
	}
	return &sp, nil
}

func (s *PgStore) UpdateSpace(ctx context.Context, sp *Space) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE spaces SET name=$2, topic=$3, state=$4, speaking_enabled=$5, livekit_room=$6, opens_at=$7, closes_at=$8 WHERE id=$1
	`, sp.ID, sp.Name, sp.Topic, sp.State, sp.SpeakingEnabled, sp.LivekitRoom, sp.OpensAt, sp.ClosesAt)
	return err
}

func (s *PgStore) ListSpacesByCommunity(ctx context.Context, communityID string) ([]Space, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, community_id, creator_id, name, topic, state, speaking_enabled, livekit_room, opens_at, closes_at, created_at
		FROM spaces WHERE community_id = $1 AND state = 'open'
		ORDER BY created_at DESC
	`, communityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Space
	for rows.Next() {
		var sp Space
		if err := rows.Scan(&sp.ID, &sp.CommunityID, &sp.CreatorID, &sp.Name, &sp.Topic, &sp.State, &sp.SpeakingEnabled, &sp.LivekitRoom, &sp.OpensAt, &sp.ClosesAt, &sp.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, sp)
	}
	return out, rows.Err()
}

func (s *PgStore) CloseExpiredSpaces(ctx context.Context) (int, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE spaces SET state = 'closed' WHERE state = 'open' AND closes_at < now()
	`)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func (s *PgStore) CreateSpeakerRound(ctx context.Context, sr *SpeakerRound) (*SpeakerRound, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO speaker_rounds (space_id, round_no, opened_at)
		VALUES ($1, $2, $3)
		RETURNING id
	`, sr.SpaceID, sr.RoundNo, sr.OpenedAt)
	if err := row.Scan(&sr.ID); err != nil {
		return nil, err
	}
	return sr, nil
}

func (s *PgStore) GetOpenRoundBySpace(ctx context.Context, spaceID string) (*SpeakerRound, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, space_id, round_no, opened_at, closed_at
		FROM speaker_rounds WHERE space_id = $1 AND closed_at IS NULL
		ORDER BY opened_at DESC LIMIT 1
	`, spaceID)
	var sr SpeakerRound
	var closedAt *time.Time
	if err := row.Scan(&sr.ID, &sr.SpaceID, &sr.RoundNo, &sr.OpenedAt, &closedAt); err != nil {
		return nil, err
	}
	sr.ClosedAt = closedAt
	return &sr, nil
}

func (s *PgStore) CloseSpeakerRound(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE speaker_rounds SET closed_at = now() WHERE id = $1
	`, id)
	return err
}

func (s *PgStore) CountSpeakerRoundsBySpace(ctx context.Context, spaceID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM speaker_rounds WHERE space_id = $1
	`, spaceID).Scan(&count)
	return count, err
}

func (s *PgStore) CreateSpeakRequest(ctx context.Context, req *SpeakRequest) (*SpeakRequest, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO speak_requests (round_id, user_id, requested_at, approved)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, req.RoundID, req.UserID, req.RequestedAt, req.Approved)
	if err := row.Scan(&req.ID); err != nil {
		return nil, err
	}
	return req, nil
}

func (s *PgStore) ListSpeakRequests(ctx context.Context, roundID string) ([]SpeakRequest, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, round_id, user_id, requested_at, approved
		FROM speak_requests WHERE round_id = $1 ORDER BY requested_at ASC
	`, roundID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SpeakRequest
	for rows.Next() {
		var r SpeakRequest
		if err := rows.Scan(&r.ID, &r.RoundID, &r.UserID, &r.RequestedAt, &r.Approved); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// ApproveEarliestRequestIfUnderCap atomically approves the earliest non-approved
// request for this round only if the current approved count is under maxSpeakers.
// Returns true if a request was approved.
func (s *PgStore) ApproveEarliestRequestIfUnderCap(ctx context.Context, roundID string, maxSpeakers int) (bool, error) {
	// CTE: only approve if current approved count < maxSpeakers
	var approvedID string
	err := s.pool.QueryRow(ctx, `
		WITH eligible AS (
			SELECT id FROM speak_requests
			WHERE round_id = $1 AND approved = false
			ORDER BY requested_at ASC
			LIMIT 1
		),
		cap AS (
			SELECT COUNT(*) AS cnt FROM speak_requests WHERE round_id = $1 AND approved = true
		)
		UPDATE speak_requests SET approved = true
		WHERE id = (SELECT id FROM eligible)
			AND (SELECT cnt FROM cap) < $2
		RETURNING id
	`, roundID, maxSpeakers).Scan(&approvedID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return approvedID != "", nil
}

// RevokeSpeakerApproval sets approved=false for a user's speak request in a round.
func (s *PgStore) RevokeSpeakerApproval(ctx context.Context, roundID, userID string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE speak_requests SET approved = false
		WHERE round_id = $1 AND user_id = $2
	`, roundID, userID)
	return err
}
