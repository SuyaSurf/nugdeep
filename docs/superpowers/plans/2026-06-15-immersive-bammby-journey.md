# Immersive Bammby Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic landing and lobby wizard with a mobile-first atmospheric journey that offers one daily game per genre, one daily activity, anonymous presence, and intent-specific social handoffs.

**Architecture:** Keep the existing Next.js lobby route and Go matchmaking service, but extract deterministic experience rules into a pure TypeScript module and presentation primitives into focused components. Reorder the client state machine to Intent -> Game -> Activity -> Queue and preserve the existing API contract.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Tailwind CSS 4, Web Audio API, Vibration API, Playwright, Go

---

### Task 1: Daily lineup and intent routing

**Files:**
- Create: `web/lib/lobby-experience.test.ts`
- Create: `web/lib/lobby-experience.ts`
- Modify: `web/package.json`

- [ ] Write failing Node tests for deterministic daily selection, one game per category, and intent handoff routing.
- [ ] Run `node --experimental-strip-types --test lib/lobby-experience.test.ts` and confirm failure because the module does not exist.
- [ ] Implement the smallest pure functions and intent metadata needed by the tests.
- [ ] Add `test:lobby` to `package.json`.
- [ ] Re-run the focused tests and confirm they pass.

### Task 2: Shared sensory shell

**Files:**
- Create: `web/components/experience/experience-audio.ts`
- Create: `web/components/experience/ExperienceShell.tsx`
- Create: `web/components/experience/PresenceField.tsx`
- Modify: `web/app/globals.css`

- [ ] Add a procedural ambient/click/reveal audio controller that only starts after user interaction.
- [ ] Add semantic light haptics with silent fallback.
- [ ] Build the pointer/touch-reactive world shell and anonymous presence layer.
- [ ] Add reduced-motion behavior, focus-visible styles, and responsive scene styles.

### Task 3: Cinematic landing

**Files:**
- Modify: `web/e2e/smoke.spec.ts`
- Modify: `web/app/page.tsx`

- [ ] Change the smoke test to expect the new arrival message and lobby entrance action.
- [ ] Run the smoke test and confirm it fails against the old page.
- [ ] Implement the arrival scene, sensory controls, and clear entrance action.
- [ ] Re-run the smoke test after the full UI is implemented.

### Task 4: Lobby decision flow

**Files:**
- Modify: `web/app/lobby/page.tsx`
- Modify: `web/app/lobby/intent-step.tsx`
- Modify: `web/app/lobby/game-picker.tsx`
- Modify: `web/app/lobby/activity-step.tsx`
- Modify: `web/lib/lobby.ts`

- [ ] Reorder the state machine to Intent -> Game -> Activity -> Queue.
- [ ] Add Make a Friend as a supported intent.
- [ ] Render the deterministic daily one-per-genre lineup.
- [ ] Add a local deterministic activity fallback and preserve selected context through errors.
- [ ] Add back navigation before queue submission.

### Task 5: Pairing and social handoff

**Files:**
- Create: `web/app/lobby/social-handoff.tsx`
- Modify: `web/app/lobby/matchmaking-status.tsx`
- Modify: `web/app/lobby/matched-screen.tsx`
- Modify: `web/app/lobby/location-picker.tsx`
- Modify: `web/app/lobby/no-match.tsx`
- Modify: `web/app/lobby/page.tsx`
- Modify: `server/internal/lobby/types.go`

- [ ] Add `make_friend` to the server intent constants.
- [ ] Replace the generic spinner with converging anonymous presence signals.
- [ ] Route Just Play to results, Make a Friend to simple chat/audio, and Speed Date through location selection to immersive chat.
- [ ] Keep unsupported media controls honest by presenting them as room affordances, not active calls.

### Task 6: Verification

**Files:**
- Modify only if verification exposes defects.

- [ ] Run `npm run test:lobby`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run the relevant Playwright smoke test.
- [ ] Inspect mobile and desktop landing states in the in-app browser.
- [ ] Review the final diff for accidental changes.

