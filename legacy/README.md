# Bammby Games

Bammby Games is a social app.

You can read anytime.

To post or comment, you finish one short daily run.

## Daily Game

The first game is **Arrival Run**.

Goal:

```text
Reach Desk 7.
Arrive before 9.
```

The route is not fixed.

A clean route can finish in 4 or 5 steps.

A messy route can go much longer.

Hard cap:

```text
Max 30 steps
```

Each step still has 4 moves:

```text
Go
Wait
Look
Around
```

The button words can change, but they stay simple:

```text
Go      -> Proceed / Finish
Wait    -> Hold / Assist
Look    -> Scan / Verify
Around  -> Reroute / Other spot
```

## Daily Pressure

Each day has three numbers:

```text
Traffic  64%
Crowd    82%
Weather  28%
```

These numbers change the game.

The same move can score differently on a different day.

Example:

```text
Proceed + low crowd  = low risk
Proceed + high crowd = high risk
```

So the player is not just memorizing answers. They are reading the day.

## Route Length

Good moves push you closer to the desk.

Bad moves add steps.

Example:

```text
Look -> find open spot -> route gets shorter
Go too early -> extra line -> route gets longer
Around -> safer, but more steps
```

This is the honest version.

Real life is not always 5 neat steps.

## Feedback

After every move, the route tile changes.

The game says one simple thing:

```text
Clean move
Cost time
Still alive
Route broke
```

No color words in the UI.

The tile state shows the result. The words explain what happened.

Each move also shows risk before you choose:

```text
Proceed / risk 94%
Hold / risk 68%
Scan / risk 55%
Reroute / risk 76%
```

That is where the depth comes from.

## Intro

Before the first move, show a short intro:

```text
North Hall: Packed morning
The main line is crowded today. Reach Desk 7 before 9.
The line starts moving. Watch the pressure. Pick one move.
```

That is enough.

No tutorial wall.

## Feed

Posts are not about the game.

The game only opens posting for the day.

Users can post in:

- personal
- news
- opportunities
- vibes
- events

Personal posts can use:

- insight
- musings
- vlogs

## Profile

Keep profile scores plain:

- Judgment
- EQ
- Reliability

Show proof from the last 7 days.

Older raw runs should not stay public by default.

## Build Order

1. Mobile feed.
2. Variable-length Arrival Run.
3. Daily pressure numbers.
4. Pressure-based score changes.
5. Risk preview before each move.
6. Run review after each attempt.
7. Posting pass.
8. Replay card.
9. Comments open after replay share.
10. Public profile.
11. Seven-day proof.
12. Server timing and scoring.
