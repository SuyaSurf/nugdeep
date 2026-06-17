package community

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"games.bammby.com/server/internal/store"
)

// Service holds community business logic.
type Service struct {
	store store.Repository
}

func NewService(s store.Repository) *Service {
	return &Service{store: s}
}

func (svc *Service) Create(ctx context.Context, ownerID string, c *store.Community, puzzle *store.Puzzle) (*store.Community, error) {
	puzzle.OwnerID = ownerID
	p, err := svc.store.CreatePuzzle(ctx, puzzle)
	if err != nil {
		return nil, fmt.Errorf("create puzzle: %w", err)
	}
	c.PuzzleID = p.ID
	comm, err := svc.store.CreateCommunity(ctx, c)
	if err != nil {
		return nil, fmt.Errorf("create community: %w", err)
	}
	// Creator is automatically owner.
	_, _ = svc.store.CreateMembership(ctx, &store.Membership{
		CommunityID: comm.ID,
		UserID:      ownerID,
		Role:        "owner",
		Via:         "manual",
	})
	return comm, nil
}

func (svc *Service) MintCode(ctx context.Context, communityID, userID string) (*store.UnlockCode, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return nil, err
	}
	code := hex.EncodeToString(b)
	uc := &store.UnlockCode{
		Code:        code,
		CommunityID: communityID,
		MintedBy:    userID,
		ExpiresAt:   time.Now().UTC().Add(24 * time.Hour),
	}
	return svc.store.CreateUnlockCode(ctx, uc)
}

func (svc *Service) RedeemCode(ctx context.Context, code, userID string) (*store.Community, error) {
	uc, err := svc.store.GetUnlockCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("invalid code")
	}
	if uc.UsedBy != nil {
		return nil, fmt.Errorf("code already used")
	}
	if time.Now().UTC().After(uc.ExpiresAt) {
		return nil, fmt.Errorf("code expired")
	}
	if err := svc.store.RedeemUnlockCode(ctx, code, userID); err != nil {
		return nil, fmt.Errorf("redeem failed")
	}
	c, err := svc.store.GetCommunityByID(ctx, uc.CommunityID)
	if err != nil {
		return nil, err
	}
	_, _ = svc.store.CreateMembership(ctx, &store.Membership{
		CommunityID: c.ID,
		UserID:      userID,
		Role:        "member",
		Via:         "code",
	})
	_ = svc.store.CreateAnalyticsEvent(ctx, userID, "community_join", map[string]any{
		"community_id": c.ID,
		"via":          "code",
	})
	return c, nil
}

func (svc *Service) UnlockByPuzzle(ctx context.Context, communityID, userID string) (*store.Community, error) {
	c, err := svc.store.GetCommunityByID(ctx, communityID)
	if err != nil {
		return nil, err
	}
	_, err = svc.store.CreateMembership(ctx, &store.Membership{
		CommunityID: c.ID,
		UserID:      userID,
		Role:        "member",
		Via:         "puzzle",
	})
	if err != nil {
		return nil, err
	}
	_ = svc.store.CreateAnalyticsEvent(ctx, userID, "community_join", map[string]any{
		"community_id": c.ID,
		"via":          "puzzle",
	})
	return c, nil
}
