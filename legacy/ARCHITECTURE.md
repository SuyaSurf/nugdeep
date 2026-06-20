# Bammby Games Architecture

Bammby Games is social first.

The daily game is the posting gate.

## Rule

```text
Read: always open
Post: needs today's pass
Comment: needs today's pass
```

## Game

First game: **Arrival Run**

Goal:

```text
Reach Desk 7 before 9.
```

Route:

```text
Best route: 4-5 steps
Bad route: up to 30 steps
```

Moves:

```text
Proceed
Hold
Scan
Reroute
```

## Daily Pressure

Each daily scenario has pressure numbers:

```json
{
  "traffic": 64,
  "crowd": 82,
  "weather": 28
}
```

The numbers affect score and time.

Same move, different day:

```text
Proceed + crowd 20% = low risk
Proceed + crowd 82% = high risk
```

This keeps the game from becoming a fixed answer sheet.

## Route Length

The game should not force exactly 5 steps.

Use route progress.

```text
destination_progress = 8
min_steps = 4
max_steps = 30
```

Each move changes progress:

```text
clean move  -> progress up
slow move   -> small progress
bad move    -> little or no progress
route broke -> stop
```

Finish when:

```text
steps >= min_steps
progress >= destination_progress
live == true
```

Stop when:

```text
steps == max_steps
```

If the player reaches max steps without enough progress, the run fails.

## Scoring

Each move has:

- base time
- base result
- pressure type
- pressure risk
- score change

Example:

```text
scene pressure: crowd
crowd today: 82%
move: Go
risk: high
effect: add time, lower score
```

Before the player chooses, show risk for each move.

```text
Proceed  risk 94%
Hold     risk 68%
Scan     risk 55%
Reroute  risk 76%
```

After the run, show a short review:

```text
8 moves. 4 clean. 2 detours.
Peak pressure: Crowd 100% on line.
```

The server should own this later.

The client can show the demo.

## Scene Shape

```json
{
  "id": "crowd-start",
  "step": "Start",
  "pressure": "crowd",
  "line": "The line starts moving.",
  "hint": "Desk 7 closes at 9.",
  "choices": {
    "go": "Proceed",
    "wait": "Hold",
    "look": "Scan",
    "around": "Reroute"
  }
}
```

Keep words short.

No clever copy.

## Intro

Generate the intro from the scenario:

```text
North Hall: Packed morning
The main line is crowded today. Reach Desk 7 before 9.
The line starts moving. Watch the pressure. Pick one move.
```

## Feedback

Do not write color names.

Use tile state plus plain text:

```text
Clean move
Cost time
Still alive
Route broke
```

## Data

### scenarios

- id
- date
- neighborhood
- setting
- destination
- traffic_pressure
- crowd_pressure
- weather_pressure
- steps_json
- benchmark_ms

### runs

- id
- user_id
- scenario_id
- time_ms
- score
- passed
- created_at

### run_events

- id
- run_id
- step_index
- action
- action_label
- pressure_type
- pressure_value
- result
- time_after_ms
- score_delta

### passes

- id
- user_id
- run_id
- valid_for_date
- created_at

### posts

- id
- user_id
- pass_id
- category
- tags
- body
- created_at

### comments

- id
- parent_id
- user_id
- pass_id
- body
- created_at

## MVP Order

1. Feed.
2. Variable-length game.
3. Pressure numbers.
4. Pressure scoring.
5. Risk preview.
6. Run review.
7. Daily pass.
8. Replay.
9. Comments after replay.
10. Profile.
11. Seven-day history.
12. Server scoring.
