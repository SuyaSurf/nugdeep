# Immersive Bammby Journey Design

## Goal

Turn the current landing page and lobby wizard into a continuous mobile-first journey that feels like approaching, entering, and moving through an enigmatic game center before being paired for one meaningful daily encounter.

## Experience Model

The product uses one persistent night-world rather than separate form screens. Each step advances deeper into the same place:

1. **Arrival** - The landing page frames Bammby as a place that is awake now. A perspective corridor, reactive light, distant anonymous silhouettes, restrained ambient sound, and pointer/touch parallax create the sense of approaching a destination.
2. **Threshold** - Entering the lobby reveals anonymous presence without profiles or fabricated identity details. Presence is communicated through moving light and soft status language, not a social feed.
3. **Intent** - The player chooses one of three doors: Speed Date, Make a Friend, or Just Play. Each door explains the social contract before selection.
4. **Daily Game Shelf** - The shelf contains at most one ready game from each genre. The choice is deterministic for the calendar day so everyone sees the same lineup and can match reliably.
5. **Daily Ritual** - One server-selected activity is shown after the game choice. The answer becomes a lightweight affinity signal used with intent and game choice.
6. **Pairing** - The selected intent, daily game, and activity outcome form the queue key. The interface shows another anonymous signal approaching rather than a generic spinner.
7. **Encounter** - The matched pair enters a short game shell that keeps both players visible as anonymous presences.
8. **Social Handoff**:
   - **Just Play** ends with result, rematch, or return to the lobby.
   - **Make a Friend** opens a simple text and push-to-talk room.
   - **Speed Date** uses the location-choice mechanic, then opens an immersive multimedia room with text, audio, camera, and VR affordances.

## Interaction Principles

- Use progressive disclosure: one consequential decision per view.
- Keep the primary action reachable by thumb and at least 44 CSS pixels high.
- Pair visual, sound, and haptic feedback only at meaningful moments: enter, select, match, and reveal.
- Respect `prefers-reduced-motion`, expose a sound control, and never require audio.
- Preserve user agency with visible back navigation before queueing and a clear queue exit.
- Avoid fake profiles, fake chat messages, and exact fake online counts. Anonymous presence is atmospheric until the backend supplies real presence data.

## Visual Direction

- Near-black indigo environment with warm amber thresholds and acid-lime signal accents.
- Editorial serif display type paired with a quiet geometric sans-serif.
- Glass, fog, scan lines, perspective grids, floating dust, and restrained 3D transforms.
- Mobile composition first: one dominant object, one short line of guidance, one obvious action.
- Desktop expands the same scene rather than becoming a dashboard.

## Architecture

- `web/lib/lobby-experience.ts` owns deterministic daily lineup selection, intent metadata, and post-game routing.
- `web/components/experience/` owns shared atmospheric, audio, haptic, and presence UI.
- `web/app/page.tsx` becomes the arrival scene.
- Existing `web/app/lobby/` components remain the state-machine boundary but are restyled and reordered to Intent -> Game -> Activity -> Queue.
- Server matchmaking continues using the composite intent/game/activity/choice key. `make_friend` is added as a first-class intent.

## Error Handling

- If the daily activity cannot load, show a deterministic local daily activity so the journey remains usable.
- If queueing fails, preserve the player's choices and show retry/AI options without dropping back to the beginning.
- Audio APIs and vibration calls fail silently because browser and device support varies.
- WebSocket messages are parsed defensively; malformed events are ignored.

## Verification

- Unit tests prove the daily shelf is deterministic and never contains more than one game per genre.
- Unit tests prove each intent routes to the correct social handoff.
- Type checking and production build must pass.
- Playwright verifies the new landing call to action and mobile layout.
- Browser inspection covers the landing page and, where authentication permits, the full lobby flow.

## Research Basis

- Apple Human Interface Guidelines: onboarding should help people start quickly; game feedback and haptics should be meaningful and coordinated with audio/visual events.
- Apple Core Haptics guidance: synchronized multimodal feedback improves realism when used at key moments.
- Progressive-disclosure guidance: defer secondary information so each step is easier to understand and less error-prone.
- Social-presence research: ambient embodiment and spatial cues can strengthen the feeling of another real person without requiring immediate identity disclosure.

