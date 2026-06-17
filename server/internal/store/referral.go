package store

import "context"

func (s *PgStore) CreateReferral(ctx context.Context, referrerID, referredID string) (*Referral, error) {
	var ref Referral
	err := s.pool.QueryRow(ctx, `
		INSERT INTO referrals (referrer_id, referred_id)
		VALUES ($1, $2)
		ON CONFLICT (referrer_id, referred_id) DO NOTHING
		RETURNING id, referrer_id, referred_id, reward_granted, created_at
	`, referrerID, referredID).Scan(&ref.ID, &ref.ReferrerID, &ref.ReferredID, &ref.RewardGranted, &ref.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &ref, nil
}

func (s *PgStore) CountReferralsByReferrer(ctx context.Context, referrerID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM referrals WHERE referrer_id = $1
	`, referrerID).Scan(&count)
	return count, err
}
