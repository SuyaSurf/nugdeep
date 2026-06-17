package api

import (
	"bytes"
	"fmt"
	"image/color"
	"image/png"
	"net/http"
	"strconv"
	"time"

	"github.com/fogleman/gg"
	"games.bammby.com/server/internal/auth"
	"games.bammby.com/server/internal/cache"
	"github.com/skip2/go-qrcode"
)

// BraggingCardPNG generates a shareable PNG card with streak stats and QR code.
func (h *Handler) BraggingCardPNG(w http.ResponseWriter, r *http.Request) {
	clerkID := auth.UserIDFromContext(r.Context())
	u, err := h.store.GetUserByClerkID(r.Context(), clerkID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	streak := u.Streak
	if h.cache != nil {
		val, _ := h.cache.GetString(r.Context(), cache.UserStreakKey(u.ID))
		if v, err := strconv.Atoi(val); err == nil {
			streak = v
		}
	}

	shareURL := "https://games.bammby.com/profile/" + u.Username

	const W, H = 600, 800
	dc := gg.NewContext(W, H)

	// Background
	grad := gg.NewLinearGradient(0, 0, float64(W), float64(H))
	grad.AddColorStop(0, color.RGBA{R: 3, G: 6, B: 23, A: 255})
	grad.AddColorStop(1, color.RGBA{R: 6, G: 60, B: 38, A: 255})
	dc.SetFillStyle(grad)
	dc.DrawRectangle(0, 0, float64(W), float64(H))
	dc.Fill()

	// Card border
	dc.SetRGBA(0.2, 0.92, 0.6, 0.3)
	dc.SetLineWidth(2)
	dc.DrawRoundedRectangle(24, 24, float64(W-48), float64(H-48), 16)
	dc.Stroke()

	// Title
	dc.SetRGBA(0.2, 0.92, 0.6, 1)
	dc.LoadFontFace("arial", 28)
	dc.DrawStringAnchored("NUGDEEP", float64(W)/2, 80, 0.5, 0.5)

	// Username
	dc.SetRGB(1, 1, 1)
	dc.LoadFontFace("arial", 36)
	dc.DrawStringAnchored(u.Username, float64(W)/2, 140, 0.5, 0.5)

	// Streak number
	dc.LoadFontFace("arial", 120)
	dc.SetRGBA(0.2, 0.92, 0.6, 1)
	dc.DrawStringAnchored(fmt.Sprintf("%d", streak), float64(W)/2, 260, 0.5, 0.5)

	// Streak label
	dc.LoadFontFace("arial", 20)
	dc.SetRGB(0.7, 0.7, 0.7)
	dc.DrawStringAnchored("DAY STREAK", float64(W)/2, 310, 0.5, 0.5)

	// Stats row
	stats := []struct {
		label string
		value string
	}{
		{"Solved", fmt.Sprintf("%d", u.PuzzlesSolved)},
		{"Wins", fmt.Sprintf("%d", u.Wins)},
		{"Best", fmt.Sprintf("%d", u.LongestStreak)},
	}
	x := 100.0
	for _, s := range stats {
		dc.SetRGB(1, 1, 1)
		dc.LoadFontFace("arial", 24)
		dc.DrawStringAnchored(s.value, x, 380, 0.5, 0.5)
		dc.SetRGB(0.5, 0.5, 0.5)
		dc.LoadFontFace("arial", 14)
		dc.DrawStringAnchored(s.label, x, 405, 0.5, 0.5)
		x += 200
	}

	// QR code
	qr, err := qrcode.Encode(shareURL, qrcode.Medium, 180)
	if err == nil {
		img, _ := png.Decode(bytes.NewReader(qr))
		if img != nil {
			dc.DrawImage(img, W/2-90, 450)
		}
	}

	// Footer
	dc.SetRGB(0.4, 0.4, 0.4)
	dc.LoadFontFace("arial", 12)
	dc.DrawStringAnchored("Scan to view profile", float64(W)/2, 660, 0.5, 0.5)

	buf := new(bytes.Buffer)
	if err := png.Encode(buf, dc.Image()); err != nil {
		respondError(w, http.StatusInternalServerError, "image encode failed")
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "max-age=60")
	w.Header().Set("X-Generated-At", time.Now().UTC().Format(time.RFC3339))
	w.WriteHeader(http.StatusOK)
	w.Write(buf.Bytes())
}
