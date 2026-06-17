# WebSocket Event Contract

Single source of truth for all WS events between Go server and clients.

## Server → Client

### `game_progress`
- **room**: `session:{session_id}`
- **payload**: `{session, user_id, result, progress}`

### `chat:new`
- **room**: `{scope}:{scope_id}` (e.g. `community:abc`, `date:xyz`)
- **payload**: full `Message` object

### `chat:held`
- **room**: `user:{user_id}` (DM to sender only)
- **payload**: `{message_id, status: "held"}`

### `date:matched`
- **room**: `user:{user_id}`
- **payload**: `{type, match, room}`

### `date:game_started`
- **room**: `date:{match_id}`
- **payload**: `{match_id, puzzle_id, deadline, target}`

### `date:progress`
- **room**: `date:{match_id}`
- **payload**: `{user_id, progress}`

### `date:decided`
- **room**: `date:{match_id}`
- **payload**: `{match_id, winner_id, expires_at}`

### `date:flip`
- **room**: `date:{match_id}`
- **payload**: `{match_id}` — 120s expired, loser can now send first message

### `date:message`
- **room**: `date:{match_id}`
- **payload**: full `Message` object

### `date:accepted`
- **room**: `date:{match_id}`
- **payload**: `{match_id, expires_at}`

### `date:declined`
- **room**: `date:{match_id}`
- **payload**: `{match_id}`

### `space:round_open`
- **room**: `space:{space_id}`
- **payload**: `{round_id, round_no}`

### `space:request_ack`
- **room**: `user:{user_id}`
- **payload**: `{approved: bool, position: int}`

### `space:speakers`
- **room**: `space:{space_id}`
- **payload**: `{speakers: [{user_id, approved}]}`

### `space:speaking_toggled`
- **room**: `space:{space_id}`
- **payload**: `{speaking_enabled: bool}`

### `space:kicked`
- **room**: `space:{space_id}`
- **payload**: `{user_id, space_id}`

### `space:muted`
- **room**: `space:{space_id}`
- **payload**: `{user_id, muted: bool, space_id}`

### `space:turn_ended`
- **room**: `space:{space_id}`
- **payload**: `{space_id, round_id}`

### `space:closed`
- **room**: `space:{space_id}`
- **payload**: `{space_id}`

### `system:match_expiry`
- **room**: `global`
- **payload**: `{expired: int}`

## Client → Server

### `room:join`
- **payload**: `{type: "room:join", room: "date:abc"}`
- Server adds connection to the room

## Connection

- **URL**: `wss://games.bammby.com/ws?token=<clerk_jwt>&rooms=room1,room2`
- Auto-joins `user:{clerk_id}` and `global` if no rooms specified
- Auth: Clerk JWT verified server-side before upgrade
