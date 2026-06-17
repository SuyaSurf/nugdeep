package referral

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
)

// GenerateCode creates a short random referral code.
func GenerateCode(userID string) string {
	b := make([]byte, 4)
	rand.Read(b)
	return strings.ToUpper(hex.EncodeToString(b))
}

// Key returns the Redis key for a referral code.
func Key(code string) string {
	return fmt.Sprintf("referral:%s", code)
}

// UserKey returns the Redis key tracking a user's referral stats.
func UserKey(userID string) string {
	return fmt.Sprintf("referral_stats:%s", userID)
}
