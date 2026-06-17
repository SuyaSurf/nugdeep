package store

import "context"

func (s *PgStore) CreateUnlockCode(ctx context.Context, uc *UnlockCode) (*UnlockCode, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO unlock_codes (code, community_id, minted_by, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`, uc.Code, uc.CommunityID, uc.MintedBy, uc.ExpiresAt)
	if err := row.Scan(&uc.ID, &uc.CreatedAt); err != nil {
		return nil, err
	}
	return uc, nil
}

func (s *PgStore) GetUnlockCode(ctx context.Context, code string) (*UnlockCode, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, code, community_id, minted_by, expires_at, used_by, used_at, created_at
		FROM unlock_codes WHERE code = $1
	`, code)
	var uc UnlockCode
	var usedBy *string
	var usedAt *interface{}
	err := row.Scan(&uc.ID, &uc.Code, &uc.CommunityID, &uc.MintedBy, &uc.ExpiresAt, &usedBy, &usedAt, &uc.CreatedAt)
	if err != nil {
		return nil, err
	}
	uc.UsedBy = usedBy
	return &uc, nil
}

func (s *PgStore) RedeemUnlockCode(ctx context.Context, code, userID string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE unlock_codes SET used_by = $2, used_at = now()
		WHERE code = $1 AND used_by IS NULL
	`, code, userID)
	return err
}
