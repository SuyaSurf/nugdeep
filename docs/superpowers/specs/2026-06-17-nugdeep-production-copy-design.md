---
title: Nugdeep Production Copy Design
status: approved
created: 2026-06-17
---

# Nugdeep Production Copy Design

## Goal

Rewrite Nugdeep user-facing copy so the app reads like a live production game, not a demo, pitch, or presentation. The approved direction is Option C: hybrid production tone.

The copy should keep Nugdeep's immersive world language where it helps mood, but every line must stay actionable for a real player.

## Voice

- Use direct, playable language: choose, enter, match, play, wait, retry, leave, rematch.
- Keep immersive language short and contextual: signal, room, door, lobby, route, tonight.
- Explain the next action or state clearly on every screen.
- Treat empty, loading, and error states as normal game states, not broken demos.
- Avoid marketing, presentation, or prototype language.

## Avoid

- Demo, preview, prototype, experience, showcase, platform.
- Sales phrasing such as unlock conversations or immersive experience.
- Vague worldbuilding that hides what the player should do next.
- Overly cute failure states that make real users feel blamed.

## Screen Direction

### Home and Metadata

Position Nugdeep as a live game destination. Copy should tell players they can enter the lobby, choose a match type, play a short game, and decide what happens after.

### Lobby Intent

Ask what kind of match the player wants. Keep the three options clear:

- Date: play first, then decide whether to enter a private room.
- Friend: play first, then continue into low-pressure chat.
- Play: quick match, score, rematch or leave.

### Game Picker

Make each game card feel playable and specific. Keep category labels, but use concrete game stakes and short descriptions instead of product phrasing.

### Daily Activity

Keep the ritual mood, but clearly state that the choice helps find someone who chose the same route. The player should understand it is part of matchmaking.

### Queue

Show that Nugdeep is finding a player with matching intent, game, and daily choice. Use clear timer/cancel language.

### Matched

Confirm opponent found, game selected, and the next button starts the game. Keep the moment exciting but not vague.

### No Match

Treat no-match as a normal outcome. Offer retry, change game, or play an AI opponent. Avoid language that implies the app failed.

### Results

Lead with score and next action. Make it clear whether the player can rematch, return to lobby, or continue to chat/date flow.

### Dating and Friend Flows

Use safe, warm, low-pressure language. Avoid salesy connection copy. Make boundaries and next steps clear.

### Profile and Leaderboard

Make utility screens feel finished. Use concise empty/loading states and player-centered labels.

## Implementation Notes

- Only change user-facing strings unless a small content constant improves maintainability.
- Do not change routes, APIs, auth behavior, matchmaking logic, or public exports.
- Preserve existing component structure unless a component is already too tangled for safe copy changes.
- Keep copy changes atomic and easy to review.

## Verification

- Run `npm run typecheck` in the web app.
- Run relevant web tests if copy changes touch tested selectors or visible flows.
- Build the web app before deployment.
- Manually inspect the lobby flow after deployment: intent, game picker, activity, queue, matched, no-match, results.
