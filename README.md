# Bammby Games

Social word-matching platform. Solve timed puzzles to unlock hidden communities and speed-date with winner-initiated chat.

## Structure

- `server/` — Go backend (chi, WebSockets, pgx, Redis)
- `web/` — Next.js 16 PWA (Tailwind, Clerk, Zustand)
- `mobile/` — Flutter creator app (puzzle + community builder)
- `legacy/` — archived Arrival Run prototype

## Local Dev

```bash
# Start dependencies
docker-compose up -d

# Server
cd server
go mod tidy
go run ./cmd/api

# Web
cd web
npm install
npm run dev

# Mobile (creator app)
cd mobile
flutter pub get
flutter run
```

## Env

Copy `.env.example` to `.env` and fill in Clerk, LiveKit, and database credentials.
