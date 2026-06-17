# Lobby Matchmaking System

## Overview
A lobby screen on the home screen with "Lobby" and "Rooms" (Rooms is a separate feature). Lobby is the 1v1 matchmaking hub: 3 choices → instant match → game → loser picks VR locations → winner chooses → chat or back to lobby.

## Flow

### 3-Step Selection
1. **Intent** — Speed Date or Just Play (two large cards, one tap)
2. **Activity** — Today's single activity from a pool of 54 (start with 6), rotated daily by `dayOfYear`. Interactive widget varies by activity type
3. **Game** — WHOT / Card VR / Pinball (three game cards). Tapping a game = instant POST to join queue

### Matchmaking Timing
- **Initial wait:** 3s (client-side spinner)
- **Waiting clock:** 30s countdown display
- **If matched:** transition to game session
- **If 33s total elapses:** DELETE queue, show "Try again" or "Play with AI"

### Match Lifecycle
```
queued → matched → playing → game_over → loser_picks → winner_picks → chat
                                              ↓                        ↓
                                         (30s timeout)      (mismatch → lobby)
```

### VR Location Phase
- A pool of 20+ VR location presets seeded in the database (e.g., "Mountain Peak", "Deep Ocean", "Space Station", "Sahara Desert", "Ancient Temple", "Neon City", "Tropical Beach", "Arctic Base", "Volcano Rim", "Underwater Ruins")
- 3 are randomly selected per match
- Loser sees the 3 options, picks 2
- Winner sees the same 3 options, picks 1
- If winner picks one of the loser's 2 → chat starts
- If winner picks the rejected one → "sorry, next time" → back to lobby
- 30s timeout on loser's pick → expired → back to lobby

## Server Architecture

### New Package: `internal/lobby/`
- `types.go` — shared types (LobbyEntry, Match, Activity, Location)
- `service.go` — Redis queue operations, match creation, location logic
- `api.go` — HTTP handlers

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/lobby/activity` | No | Today's activity |
| POST | `/api/v1/lobby/queue` | Yes | Join queue with `{intent, game, activity_code, choice}` |
| DELETE | `/api/v1/lobby/queue` | Yes | Leave queue |
| POST | `/api/v1/lobby/{matchId}/locations` | Yes | Loser picks 2 of 3 locations |
| POST | `/api/v1/lobby/{matchId}/choose-location` | Yes | Winner picks 1 of 3 |
| POST | `/api/v1/lobby/ai` | Yes | Start AI game (stub) |

### Redis Keys
```
lobby_queue:{intent}:{game}:{activity_code}:{choice}  → Sorted Set (score = unix timestamp)
lobby_match:{matchId}                                  → Hash (match state)
lobby_locations:{matchId}                              → Hash (location choices)
```

### Matchmaking Logic (POST `/api/v1/lobby/queue`)
1. Build composite key from `{intent, game, activity_code, choice}`
2. `ZRANGE` the sorted set → get oldest waiting user (lowest score)
3. If found within 60s → `ZREM` them, create match record, broadcast `lobby:matched` to both via `user:{id}`
4. If not → `ZADD` self, return `{status:"queued", queued_at: timestamp}`
5. If found but >60s stale → `ZREM` + ignore (cleanup worker handles these)

### Activity System
- 54 activities predefined, seeded in DB or config
- Each has: `id, day_of_year, prompt, type, options[]`
- `day_of_year % 54` determines today's activity
- Start with 6 activities, expand to 54 over time
- Types: number_picker, color_picker, seat_selector, puzzle, spot_diff, choice_grid

### WebSocket Events

| Event | Room | Payload |
|-------|------|---------|
| `lobby:matched` | `user:{id}` | `{match_id, opponent, intent, game, activity_code, choice}` |
| `lobby:game_over` | `lobby:{matchId}` | `{winner_id, loser_id}` |
| `lobby:location_prompt` | `user:{loser_id}` | `{locations: [{id, name, image_url}], match_id}` |
| `lobby:location_picked` | `user:{winner_id}` | `{locations: [{id, name, image_url}], match_id}` (loser's 2 picks + the 1 they removed) |
| `lobby:location_chosen` | `user:{winner_id}`, `user:{loser_id}` | `{match: true, location_id}` or `{match: false}` |
| `lobby:expired` | `user:{id}` | `{reason: "timeout"}` |

### Background Worker
- Every 10s: `ZREMRANGEBYSCORE` on all `lobby_queue:*` keys, remove entries older than 60s
- Location phase timeout: 30s from `lobby:game_over` → if loser doesn't pick, broadcast `lobby:expired`

## Client Architecture

### New Route
`/lobby` (protected by Clerk middleware)

### Components
```
app/lobby/
  page.tsx                — Orchestrator, fetches today's activity
  intent-step.tsx         — Speed Date / Just Play (2 cards)
  activity-step.tsx       — Dynamic activity widget by type
  game-picker.tsx         — WHOT / Card VR / Pinball
  matchmaking-status.tsx  — 3s spinner → 30s countdown → matched/timeout
  matched-screen.tsx      — "Matched with [user]" → transitions to game
  location-picker.tsx     — Loser: pick 2 of 3. Winner: pick 1 of 3
  no-match.tsx            — Try again / Play with AI options
  lobby-client.ts         — WebSocket + API client for lobby
```

### Client State Machine
```
idle → intent_selected → activity_selected → game_selected → queued
  → matched → playing → game_over → loser_picking → winner_picking → chat
  → no_match → (try_again → idle | ai_play → ai_game)
```

### Data Flow
1. On mount: `GET /api/v1/lobby/activity` → render activity widget
2. Step 1 tap → animate to activity step
3. Activity interaction completed → animate to game picker
4. Game tap → `POST /api/v1/lobby/queue` with all 3 choices
5. If `{status:"queued"}` → start 3s timer → transition to 30s clock
6. On `lobby:matched` WS event → show matched screen → enter game
7. On game over → show location picker for loser
8. On location chosen → start chat or return to lobby

### Activity Widgets (at least 6 types)
Each type has a unique interactive widget that returns a `choice` string:
- **number_picker:** Tap a number 1-10 (grid or radial)
- **color_picker:** Tap a color swatch
- **seat_selector:** 3D scene (plane, event) — tap a seat
- **puzzle:** Simple puzzle with answer choice
- **spot_diff:** Find the difference, tap it

### Game Stubs
Post-match, transition to a game session shell. Real game implementations plug in later. The shell shows:
- Opponent name/avatar
- Game name + placeholder visual
- "Waiting for game implementation" notice

## Game Library
30 games across 10 categories with distinct visual identities. See `docs/ideas.md` and `docs/aesthetics-strategy.md` for full details.

### Categories
- Nerve (6): The Button, Chicken, Roulette, Flip, Bomb, Dice Fate
- Reflex (2): Quick Draw, Bell Ringer
- Psychology (4): Simul-Pick, Compass, Sabotage, The Offering
- Social/Creative (6): Which One, Story Dice, Gesture, Bouquet, Palette, Pairing
- Strategy (5): Scales, Plank, Sumo, Boil, Kite Fight
- Knowledge (5): Food Remedy, Style Match, Kitchen Math, Ingredient Swap, 5-Move Chess
- Visual (2): Spot the Difference, War (Ante)

### Core Game Interface
All games implement:
```
interface QuickGame {
  id: string
  name: string
  roundTime: number       // seconds per round
  maxRounds: number       // rounds per match
  render(props: GameProps): ReactNode
  onAction(action: GameAction): void
}
```

## Sequence Diagrams

### Matchmaking Flow
```
Client A          Server             Redis              Client B
  |                  |                  |                   |
  |-- POST /queue -->|                  |                   |
  |  {intent,game,   |                  |                   |
  |   activity,choice}|                 |                   |
  |                  |-- ZRANGE ------->|                   |
  |                  |  (no one found)  |                   |
  |                  |-- ZADD --------->|                   |
  |<- {queued,ts} ---|                  |                   |
  |                  |                  |                   |
  |  (later)         |                  |-- POST /queue --->|
  |                  |<-- ZRANGE -------|                   |
  |                  |  (found Client A)|                   |
  |                  |-- ZREM --------->|                   |
  |                  |  Create match    |                   |
  |<- lobby:matched -|                  |-- lobby:matched ->|
  |                  |                  |                   |
```

### VR Location Flow
```
Loser              Server              Winner
  |                  |                   |
  |-- POST /lobby/  |                   |
  |  locations ----> |                   |
  |  {picks: [id1,  |                   |
  |   id2]}          |                   |
  |                  |--- lobby:        |
  |                  |    location_     |
  |                  |    picked ------>|
  |                  |                   |-- POST /lobby/
  |                  |                   |  choose-location
  |                  |<----------------- |  {location_id}
  |                  |                   |
  |-- lobby:        |                   |
  |  location_      |-- lobby:location_ |
  |  chosen ------->|  chosen --------->|
  |  {match:true}   |                   |
```

## Edge Cases
- **Both players join queue simultaneously:** First POST wins, second finds a match
- **User disconnects while queued:** Cleanup worker removes stale entries (<60s)
- **User disconnects during game:** Opponent gets auto-win, back to lobby
- **User disconnects during location phase:** 30s timeout → back to lobby
- **Same user in queue multiple times:** Prevent via session check (user can only have one active queue entry)
- **Multiple games selected:** Only one active match per user at a time

## Future Considerations
- Rooms (creator-hosted sessions with fan join/play/voice)
- Group matching (3+ players)
- Ranked/Elo-based matching
- Activity daily rotation with 54 total
- Game engine integration (WHOT, Card VR, Pinball implementations)
