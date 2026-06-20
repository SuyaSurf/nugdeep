# Cinematic Audio-Visual System for Bammby Games

## Problem

Bammby's social network/game lacks immersion. Deep codebase audit revealed:

**Audio Crisis (4 independent systems, 3 AudioContexts, 90% dead code):**
- `audio-engine.ts` (90% dead) — `useGameAudio()` has 0 callers, per-category presets for 30 games are unused
- `experience-mixer.ts` (active) — 3-channel mixer but `setChannelVolume()` never called
- `experience-audio.ts` (active) — own AudioContext DUPLICATES mixer's ambient drone (42/63/84 Hz)
- `AudioSystem.ts` (wordcard) — completely independent, no mute/sound toggle, `useCardAudio()` hook never called
- `audio-store.ts` (zustand) — **0 imports**, completely dead code
- `"bammby-sound"` localStorage **written on toggle but NEVER READ on load** — user preference is saved but never restored
- Three independent AudioContexts competing with zero coordination
- `queue_searching` event defined in `events.ts` and handled by `ExperienceEventDirector` but **NEVER EMITTED**

**Animation Crisis (no library, missing assets, unscaffolded):**
- Rive `.riv` files are **custom project assets** with specific artboards (`"Mascot"`, `"Ceremony"`, `"Status"`) and state machine triggers — they do not exist publicly for download
- Worse: `RiveActor` and `RiveCeremony` are **never imported anywhere** — the entire Rive system is scaffolding with zero consumers
- `getRiveAsset()` helpers are only called in test files, never in production
- No CSS classes for Rive fallbacks exist anywhere (`.rive-fallback`, `.rive-actor`)
- Status assets (`searching.riv`, `selected.riv`) have no rendering component at all
- Zero animation library in dependencies — only CSS transitions + `requestAnimationFrame`

**Game Renderer Crisis (uniformly bare):**
- All 8 game renderers are text + buttons with `requestAnimationFrame` loops
- Exactly 1 CSS transition across all 8 games (Chicken's bar color)
- Dice Fate has the most "animation" = `setInterval` cycling dice faces
- Zero particles, zero screen shake, zero celebration effects in games
- `useScreenShake()` and `useParticleBurst()` in `visual-engine.tsx` exist but are never called

**Transition Crisis (zero phase animations):**
- All `setPhase()` calls in the lobby are instant with no transition
- No `AnimatePresence`, no CSS animation classes on mount/unmount, no GSAP
- The 3-step progress dots toggle `is-active` instantly

## Research Summary

| Source | Key Finding |
|--------|------------|
| MDN Web Audio Best Practices | AudioContext from user gesture; AudioParam scheduling; DynamicsCompressorNode; Page Visibility API |
| web.dev Game Audio Guide | Spatial audio via PannerNode; AnalyserNode for reactive visuals; compressor for richness |
| Howler.js (de facto HTML5 game audio) | Cross-browser autoplay; codec fallback; sound pooling; spatial; 7KB gzipped |
| Tone.js v15 | De facto web music/synth standard; scheduling; effects; musical abstractions |
| GSAP | Hollywood-grade timeline engine; spring physics; scroll-driven; zero deps on design assets |
| MCP: bfxr2-mcp-server | 20+ SFX types (pickup, laser, explosion, coin, whoosh, click); full parameter control |
| MCP: 16bits-audio-mcp | BGM composition; jingle generation; 20 SE types; FM synthesis; ADSR; reverb |
| MCP: voice-soundboard | 48 voices; 9 languages; emotion spans; SFX tags via `[ding]` `[whoosh]` `[tada]` |

## Architecture

```
                    ┌──────────────────────────────┐
                    │      AudioManager (new)       │
                    │  ┌──────────────────────────┐ │
                    │  │ MasterGain (DynamicsComp) │ │
                    │  │  ├─ sfx Bus (Howler.js)  │ │
                    │  │  ├─ music Bus (Tone.js)  │ │
                    │  │  ├─ ambient Bus (Tone.js) │ │
                    │  │  └─ voice Bus (LiveKit)   │ │
                    │  ├─ AnalyserNode             │ │
                    │  └─ PageVisibility            │ │
                    └──┬───────────────────────────┘ │
                       │ reads from                  │
                    ┌──▼───────────────────────────┐ │
                    │   audio-store.ts (zustand)     │ │
                    │   (isEnabled, isMuted,         │ │
                    │    sfxVolume, musicVolume,     │ │
                    │    ambientVolume, masterVolume)│ │
                    │   + zustand/middleware persist │ │
                    └────────────────────────────────┘ │
                                                      │
   ┌──────────────────────────────────────────────────┘
   ▼
┌────────────────────────────────────────────────┐
│          CinematicOrchestrator (new)            │
│  ┌────────────────────────────────────────┐    │
│  │ subscribes to experience-event-store   │    │
│  │ dispatches to:                         │    │
│  │  ├─ AudioManager (sound SFX + music)   │    │
│  │  └─ AnimationDirector (GSAP timelines) │    │
│  │     ├─ PageTransitions                 │    │
│  │     ├─ PhaseTransitions (lobby steps)  │    │
│  │     ├─ MascotAnimations (GSAP, no Rive)│    │
│  │     ├─ CeremonyAnimations              │    │
│  │     ├─ MicroInteractions (hover/press) │    │
│  │     ├─ TimerUrgency                    │    │
│  │     ├─ Confetti + Particles            │    │
│  │     └─ ScreenShake                     │    │
│  └────────────────────────────────────────┘    │
└────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 0: Delete Dead Code, Install GSAP, Create Animation Components

**Goal**: Remove Rive dependency, delete dead audio code, install GSAP, scaffold replacement animation hierarchy.

#### 0.1 Remove Rive
- `npm uninstall @rive-app/react-canvas`
- Delete `components/experience/RiveActor.tsx`
- Delete `components/experience/RiveCeremony.tsx`
- Delete `lib/experience/rive-assets.ts` and its test
- Delete `lib/ai-characters.test.ts` (Rive-specific test)
- Remove the 10 empty directories under `public/assets/rive/` (keep `.gitkeep` for structure or remove entirely)
- Remove unused Rive CSS references from `globals.css`

#### 0.2 Create GSAP Mascot + Ceremony Replacements

**`components/experience/MascotAnimation.tsx`**
- GSAP-based animated character card (CSS transforms + opacity + scale)
- Mood states: `idle` (gentle bob), `selected` (scale+glow), `thinking` (head-tilt pulse), `win` (bounce+sparkle), `lose` (fade+sigh)
- No .riv files needed — pure DOM animation via GSAP
- Accepts: `mood`, `accent`, `name`, `level`

**`components/experience/CeremonyAnimation.tsx`**
- GSAP timeline per ceremony type
- `match-found`: scale-in + radial glow + sparkle particles
- `game-over`: full-screen overlay + outcome text reveal
- `score-reveal`: number count-up animation
- `chat-unlocked`: slide-in panel + glow pulse

#### 0.3 Delete Dead Audio Code
- `npm uninstall @rive-app/react-canvas` (redundant)
- Delete `lib/juice/audio-engine.ts` entirely (90% dead, `useGameAudio` never called)
- Delete `lib/stores/audio-store.ts` entirely (0 imports, will replace with new one)
- Delete `components/wordcard/AudioSystem.ts` (independent, no mute, will be replaced)

**Files changed:** 8 deleted, 2 created

---

### Phase 1: Unify Audio Architecture

**Goal**: One AudioManager, one AudioContext, connected to audio-store.

#### 1.1 Create `lib/juice/audio-manager.ts`
- Singleton with lazy `AudioContext`
- `DynamicsCompressorNode` at master (fuller/richer sound)
- `AnalyserNode` for reactive visuals
- 4 channels: `sfx`, `music`, `ambient`, `voice` (each a `GainNode`)
- Page Visibility API handler
- Methods: `enable()`, `disable()`, `setChannelVolume()`, `setMasterVolume()`, `isEnabled()`

#### 1.2 Rewrite `lib/stores/audio-store.ts`
```typescript
interface AudioState {
  isEnabled: boolean;
  isMuted: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  ambientVolume: number;
}
```
- zustand persist middleware to localStorage (fixes the "written but never read" bug)
- On init: reads localStorage, if previously enabled → audio should auto-start on first click

#### 1.3 Install Howler.js + Tone.js
```bash
npm install howler @types/howler tone
```

- `lib/juice/sfx-library.ts`: Howler.js wrapper loading generated WAV assets
- `lib/juice/music-system.ts`: Tone.js dynamic music beds (replaces procedural `startMusicBed()`)

#### 1.4 Rewrite `components/experience/experience-audio.ts`
- Thin wrapper around AudioManager + audio-store
- `enableExperienceAudio()` → resumes AudioContext, fades in ambient
- `disableExperienceAudio()` → fades out all, persists to store
- Auto-enable on first click via root-level listener

#### 1.5 Delete `components/wordcard/AudioSystem.ts`
- WordCard uses AudioManager's sfx channel like everything else

**Files changed:** 3 created, 3 rewritten, 2 deleted

---

### Phase 2: Generate Sound Assets via MCP

**Goal**: Replace thin procedural tones with generated WAV assets.

#### 2.1 MCP Setup
Add to project's MCP config:
- `bfxr2-mcp-server` — SFX generation (click, whoosh, fanfare, buzz, thud, bell)
- `16bits-audio-mcp` — BGM loops, jingles, ambient drones

#### 2.2 Create `scripts/generate-audio-assets.ts`
Manifest-driven generator:
- UI sounds: hover, select, back, enter, error
- Ceremony sounds: match-found, game-over-win, game-over-lose, chat-unlocked, score-reveal
- Game category music beds: nerve, reflex, psychology, social, strategy, knowledge, visual
- Scene ambients: lobby, date-room-garden, date-room-rooftop, date-room-observatory, expedition
- Timer: countdown-tick, countdown-urgent
- Output: WAV files to `web/public/assets/audio/`
- Manifest: `web/public/assets/audio/manifest.json`

#### 2.3 Preloading
- `sfx-library.ts` loads manifest on app init
- Decode audio during first interaction (AudioContext resume)
- Fallback: missing asset → procedural generator

**Files changed:** 1 created script, ~30 WAV files in public/assets/audio/

---

### Phase 3: Build GSAP Cinematic Animation System

**Goal**: Timeline-driven, audio-synced cinematic animations.

#### 3.1 Create `lib/juice/animation-director.ts`
Central director using GSAP timelines:

```typescript
export class AnimationDirector {
  // Page transitions
  fadeOut(el: HTMLElement): Promise<void>
  fadeIn(el: HTMLElement): Promise<void>
  
  // Phase transitions (lobby steps)
  transitionOut(currentPhase: HTMLElement): Promise<void>
  transitionIn(nextPhase: HTMLElement): Promise<void>
  
  // Ceremony sequences
  matchFoundSequence(container: HTMLElement): gsap.core.Timeline
  gameOverSequence(outcome: 'win'|'lose'): gsap.core.Timeline
  scoreRevealSequence(el: HTMLElement, score: number): gsap.core.Timeline
  chatUnlockedSequence(container: HTMLElement): gsap.core.Timeline
  
  // Micro-interactions
  buttonHover(btn: HTMLElement): void
  buttonPress(btn: HTMLElement): void
  timerUrgency(ring: HTMLElement, seconds: number): void
  
  // Effects
  confettiBurst(origin: {x:number,y:number}): void
  screenFlash(color: string): void
  radialGlow(container: HTMLElement): void
}
```

#### 3.2 Lobby Phase Transitions
Create `components/experience/PhaseTransition.tsx`:
- Wraps each lobby phase with mount/unmount animation
- Works with `setPhase()` in `page.tsx`
- GSAP animation map per phase type (intent→game→activity→queued→matched→playing)

#### 3.3 Page Transitions
Create `components/experience/PageTransition.tsx`:
- Wrap in root layout
- Fade + scale transitions on route change
- Screen flash on navigation
- Respects `prefers-reduced-motion`

#### 3.4 Event Wires
- All `setPhase()` calls → `transitionOut()` → delayed `setPhase()` → `transitionIn()`
- All ceremony events → trigger `AnimationDirector` sequence + `AudioManager` sound

**Files changed:** 2 created, lobby page modified

---

### Phase 4: Audio-Visual Orchestration

**Goal**: Every event dispatches synchronized audio + visual sequence.

#### 4.1 Create `lib/experience/cinematic-orchestrator.ts`
Single orchestrator reading `experience-event-store`:

| Event | Audio | Visual |
|-------|-------|--------|
| `queue_searching` | Music bed low + soft pulse | Radar sweep + breathing glow |
| `match_found` | Ascending arpeggio + chime | CeremonyAnimation: radial glow + sparkle burst |
| `game_start` | Quick reveal sound | Screen flash + game slide-in |
| `round_resolved` (win) | Fanfare + bell cascade | Confetti + particle burst + screen shake |
| `round_resolved` (lose) | Descending sigh | Red flash + shake (medium) |
| `score_changed` | Click per point | Number count-up (GSAP) |
| `game_over` | Fanfare or sigh + stop music | CeremonyAnimation: outcome reveal |
| `chat_unlocked` | Rising chime triplet | Chat panel slide-up + glow |
| `message_received` | Subtle notification ping | Message bubble scale-in |
| `no_match` | Soft descending tone | Radar fade-out, AI cards slide-up |
| `ai_selected` | Glitch/stutter sound | Character card scale-in + glow |
| `hover` (new) | Soft whoosh (try/catch) | Button scale 1→1.05, subtle glow |
| `countdown_urgent` (new) | Accelerating tick | Ring pulse + color shift + shake |

#### 4.2 Auto-Enable Sound on First Click
In root layout:
```typescript
useEffect(() => {
  const handler = () => {
    const { isEnabled, setEnabled } = useAudioStore.getState();
    if (!isEnabled) enableExperienceAudio().then(() => setEnabled(true));
  };
  document.addEventListener('pointerdown', handler, { once: true });
  return () => document.removeEventListener('pointerdown', handler);
}, []);
```

#### 4.3 Add Missing Event Emissions
- `page.tsx` `queued` phase → emit `queue_searching`
- `lobby-phase` components → emit `hover` events for micro-interactions

**Files changed:** 2 created, 3 modified

---

### Phase 5: Game Renderer Upgrades

**Goal**: Every game feels like a mini-cinematic experience.

#### 5.1 Upgrade pattern for all 8 renderers
Each renderer gets:
- Background animation (pulsing gradient, particle field, category-themed)
- Animated prompt text (fade-in on mount)
- `TimerRing` component (from Phase 4) instead of text countdown
- Result animations (confetti for wins, GSAP number count-up)
- Micro-interactions on all buttons
- Category-calibrated audio via `AudioManager` game presets

#### 5.2 Create celebration components
- `components/juice/Confetti.tsx` — canvas-based burst
- `components/juice/ScorePopup.tsx` — floating animated score
- `components/juice/ResultReveal.tsx` — cinematic result card

#### 5.3 Timer Ring upgrade
- SVG ring with GSAP dashoffset animation
- 5s threshold: color interpolates purple→red, ring pulses, screen shake
- Tick accelerates: 1s intervals → 0.5s at <5s → 0.25s at <3s

**Files changed:** 8 game renderers modified, 3 celebration components created

---

### Phase 6: Spatial Audio for 3D Scenes

#### 6.1 `useSpatialAudio()` hook (Three.js)
```typescript
const { playAtPosition, updateListener } = useSpatialAudio();
```
- Creates PannerNode per sound source
- Updates position each frame via `useFrame`
- Distance model: inverse, refDistance=1, maxDistance=20

#### 6.2 Upgrade 3D scenes
- `ArrivalScene3D`: building hum, wind, footstep approach
- `AmbientCity`: distant city drone, spatial fog particles
- `LocationScene`: per-location ambient (garden: birds, rooftop: wind, observatory: star drone)
- `WordCard Scene3D`: card flip at card position

**Files changed:** 1 created hook, 4 3D scenes modified

---

### Phase 7: UI/UX Flow Polish

#### 7.1 Persistent sound toggle in Nav
- Reads/writes `audio-store` (persisted via zustand middleware)
- Works across all pages (not per-page like current)

#### 7.2 Loading states
- `LoadingSkeleton.tsx` with GSAP shimmer
- Used in expedition atlas, leaderboard, profile

#### 7.3 Onboarding tutorial
- `TutorialOverlay.tsx` — first-visit detection
- Steps with sound cues + highlight animations
- Dismissable, never shown again

#### 7.4 Fix `prefers-reduced-motion`
- Global CSS class on root
- All GSAP timelines check before playing
- `AnimationDirector` skips all animations when active

**Files changed:** 3 created, 3 modified

---

## Package Changes

| Action | Package | Purpose |
|--------|---------|---------|
| REMOVE | `@rive-app/react-canvas` | Unused, missing assets |
| ADD | `howler` + `@types/howler` | Cross-browser audio playback |
| ADD | `tone` | Music synthesis, scheduling |
| ADD | `gsap` | Timeline animations, cinematic sequences |

## Files: Created (18)

| File | Purpose |
|------|---------|
| `lib/juice/audio-manager.ts` | Central audio controller |
| `lib/juice/sfx-library.ts` | Howler.js SFX loader |
| `lib/juice/music-system.ts` | Tone.js music engine |
| `lib/juice/spatial-audio.ts` | Three.js PannerNode hook |
| `lib/juice/animation-director.ts` | GSAP timeline sequences |
| `lib/experience/cinematic-orchestrator.ts` | Event→audio+visual dispatch |
| `lib/stores/audio-store.ts` | Rewritten with persist middleware |
| `components/experience/MascotAnimation.tsx` | GSAP mascot (replaces RiveActor) |
| `components/experience/CeremonyAnimation.tsx` | GSAP ceremony (replaces RiveCeremony) |
| `components/experience/PhaseTransition.tsx` | Lobby step transitions |
| `components/experience/PageTransition.tsx` | Page route transitions |
| `components/juice/TimerRing.tsx` | Animated countdown ring |
| `components/juice/Confetti.tsx` | Canvas confetti burst |
| `components/juice/ScorePopup.tsx` | Floating score numbers |
| `components/juice/ResultReveal.tsx` | Cinematic result card |
| `components/juice/LoadingSkeleton.tsx` | Animated loading |
| `components/juice/TutorialOverlay.tsx` | Onboarding tutorial |
| `scripts/generate-audio-assets.ts` | MCP audio generation pipeline |

## Files: Modified (25+)

| File | Change |
|------|--------|
| `package.json` | Remove `@rive-app/react-canvas`, add howler/tone/gsap |
| `lib/stores/audio-store.ts` | Full rewrite with persist + channels |
| `components/experience/experience-audio.ts` | Delegate to AudioManager + audio-store |
| `components/experience/ExperienceShell.tsx` | Use global audio-store, remove per-page toggle |
| `components/experience/ExperienceEventDirector.tsx` | Split to orchestrator pattern |
| `components/arrival/ArrivalScene3D.tsx` | Auto-enable sound on enter, ambient spatial |
| `components/arrival/AmbientCity.tsx` | Spatial audio hook |
| `components/Nav.tsx` | Persistent global sound toggle |
| `app/layout.tsx` | First-click audio init + PageTransition |
| `app/lobby/page.tsx` | Phase transitions + `queue_searching` emit |
| `app/lobby/intent-step.tsx` | Exit/enter animation |
| `app/lobby/game-picker.tsx` | Card animations |
| `app/lobby/activity-step.tsx` | Option animations |
| `app/lobby/matchmaking-status.tsx` | Audio-reactive radar |
| `app/lobby/matched-screen.tsx` | CeremonyAnimation integration |
| `app/lobby/no-match.tsx` | MascotAnimation integration |
| `app/lobby/social-handoff.tsx` | Chat-unlocked ceremony |
| `app/lobby/location-picker.tsx` | Location reveal animation |
| `components/game/GameShell.tsx` | Celebration results + timer upgrades |
| `lib/games/the-button.tsx` | Animated counter + timer ring |
| `lib/games/quick-draw.tsx` | Countdown animation + signal flash |
| `lib/games/dice-fate.tsx` | 3D dice roll animation |
| `lib/games/simul-pick.tsx` | Reveal animation |
| `lib/games/which-one.tsx` | Match/no-match reveal |
| `lib/games/palette.tsx` | Color fade + gradient reveal |
| `lib/games/food-remedy.tsx` | Correct/wrong animations |
| `components/date/LocationScene.tsx` | Per-location spatial ambients |
| `components/wordcard/WordCardGame.tsx` | Remove AudioSystem, use AudioManager |

## Files: Deleted (7)

| File | Reason |
|------|--------|
| `components/experience/RiveActor.tsx` | Replaced by MascotAnimation |
| `components/experience/RiveCeremony.tsx` | Replaced by CeremonyAnimation |
| `lib/experience/rive-assets.ts` | Rive dependency removed |
| `lib/experience/rive-assets.test.ts` | Rive test removed |
| `lib/juice/audio-engine.ts` | 90% dead, replaced by audio-manager |
| `components/wordcard/AudioSystem.ts` | Independent, no mute, replaced by audio-manager |
| `public/assets/rive/` (10 dirs) | Only .gitkeep files, no real assets |

## MCP Configuration

```json
{
  "mcpServers": {
    "bfxr2-audio": {
      "type": "stdio",
      "command": "npx",
      "args": ["bfxr2-mcp-server"]
    },
    "16bits-audio": {
      "type": "stdio",
      "command": "npx",
      "args": ["16bits-audio-mcp"]
    }
  }
}
```

## Test Plan

1. **Sound auto-enables**: First click anywhere → AudioContext resumes, ambient fades in
2. **Preference persists**: Enable sound, navigate away, return → sound still on
3. **3 AudioContexts become 1**: Only one AudioContext active at any time
4. **Mute/unmute**: Global mute stops all channels; unmute resumes at previous volume
5. **GSAP mascots**: Each mood state triggers correct animation (bob/pulse/bounce)
6. **Phase transitions**: Each lobby step has smooth entrance/exit animation
7. **Timer urgency**: <5s triggers visual pulse + audio tick acceleration
8. **Game celebrations**: Win round → confetti + score fly-up + fanfare
9. **Spatial audio**: Moving camera pans sound accordingly
10. **prefers-reduced-motion**: All animations skip when OS setting is enabled
11. **MCP generation**: `generate-audio-assets.ts` produces valid WAV files
12. **Queue search event**: Entering queue triggers music bed low (currently missing)
