package store

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *PgStore) CreateCommunity(ctx context.Context, c *Community) (*Community, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO communities (slug, name, description, hint, icon_url, puzzle_id, max_members, hidden)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`, c.Slug, c.Name, c.Description, c.Hint, c.IconURL, c.PuzzleID, c.MaxMembers, c.Hidden)
	if err := row.Scan(&c.ID, &c.CreatedAt); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *PgStore) GetCommunityBySlug(ctx context.Context, slug string) (*Community, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, slug, name, description, hint, icon_url, puzzle_id, max_members, hidden, boost_until, created_at
		FROM communities WHERE slug = $1
	`, slug)
	return scanCommunity(row)
}

func (s *PgStore) GetCommunityByID(ctx context.Context, id string) (*Community, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, slug, name, description, hint, icon_url, puzzle_id, max_members, hidden, boost_until, created_at
		FROM communities WHERE id = $1
	`, id)
	return scanCommunity(row)
}

func (s *PgStore) ListCommunities(ctx context.Context, filter CommunityFilter) ([]Community, error) {
	q := `
		SELECT id, slug, name, description, hint, icon_url, puzzle_id, max_members, hidden, boost_until, created_at
		FROM communities WHERE 1=1`
	args := []any{}
	argNo := 1
	if filter.Hidden != nil {
		q += fmt.Sprintf(" AND hidden = $%d", argNo)
		args = append(args, *filter.Hidden)
		argNo++
	}
	if filter.Boosted {
		q += " AND boost_until > now()"
	}
	q += " ORDER BY created_at DESC"
	if filter.Limit > 0 {
		q += fmt.Sprintf(" LIMIT $%d", argNo)
		args = append(args, filter.Limit)
	}
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Community
	for rows.Next() {
		c, err := scanCommunity(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

func scanCommunity(row pgx.Row) (*Community, error) {
	var c Community
	var bu *time.Time
	err := row.Scan(&c.ID, &c.Slug, &c.Name, &c.Description, &c.Hint, &c.IconURL, &c.PuzzleID, &c.MaxMembers, &c.Hidden, &bu, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	c.BoostUntil = bu
	return &c, nil
}

// Memberships

func (s *PgStore) CreateMembership(ctx context.Context, m *Membership) (*Membership, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO memberships (community_id, user_id, role, via)
		VALUES ($1, $2, $3, $4)
		RETURNING id, joined_at
	`, m.CommunityID, m.UserID, m.Role, m.Via)
	if err := row.Scan(&m.ID, &m.JoinedAt); err != nil {
		return nil, err
	}
	return m, nil
}

func (s *PgStore) GetMembership(ctx context.Context, communityID, userID string) (*Membership, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, community_id, user_id, role, via, joined_at
		FROM memberships WHERE community_id = $1 AND user_id = $2
	`, communityID, userID)
	var m Membership
	err := row.Scan(&m.ID, &m.CommunityID, &m.UserID, &m.Role, &m.Via, &m.JoinedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *PgStore) ListMembers(ctx context.Context, communityID string) ([]Membership, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, community_id, user_id, role, via, joined_at
		FROM memberships WHERE community_id = $1 ORDER BY joined_at DESC
	`, communityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Membership
	for rows.Next() {
		var m Membership
		if err := rows.Scan(&m.ID, &m.CommunityID, &m.UserID, &m.Role, &m.Via, &m.JoinedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *PgStore) CountMembers(ctx context.Context, communityID string) (int, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM memberships WHERE community_id = $1
	`, communityID)
	var n int
	err := row.Scan(&n)
	return n, err
}

func (s *PgStore) DeleteMembership(ctx context.Context, communityID, userID string) error {
	_, err := s.pool.Exec(ctx, `
		DELETE FROM memberships WHERE community_id = $1 AND user_id = $2
	`, communityID, userID)
	return err
}

func (s *PgStore) UpdateMembershipRole(ctx context.Context, communityID, userID, role string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE memberships SET role = $3 WHERE community_id = $1 AND user_id = $2
	`, communityID, userID, role)
	return err
}

// GetCommunitiesByMember returns all communities a user is a member of.
func (s *PgStore) GetCommunitiesByMember(ctx context.Context, userID string) ([]Community, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT c.id, c.slug, c.name, c.description, c.hint, c.icon_url, c.puzzle_id, c.max_members, c.hidden, c.boost_until, c.created_at
		FROM communities c
		JOIN memberships m ON m.community_id = c.id
		WHERE m.user_id = $1
		ORDER BY c.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Community
	for rows.Next() {
		var c Community
		if err := rows.Scan(&c.ID, &c.Slug, &c.Name, &c.Description, &c.Hint, &c.IconURL, &c.PuzzleID, &c.MaxMembers, &c.Hidden, &c.BoostUntil, &c.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
