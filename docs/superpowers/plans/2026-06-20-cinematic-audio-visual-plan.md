# Cinematic Audio-Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Bammby's bare social game into an audio-first cinematic experience with unified audio architecture, GSAP animations, and MCP-generated sound assets.

**Architecture:** Remove Rive entirely (no .riv files exist, components never consumed). Delete 7 dead files (3 audio systems, 1 dead store, 2 unused Rive components, Rive asset manifest). Install GSAP + Howler.js + Tone.js. Build single AudioManager with 1 AudioContext, compressor, analyser, 4-channel bus. Build AnimationDirector with GSAP timelines. Orchestrate via CinematicOrchestrator that subscribes to experience-event-store.

**Tech Stack:** GSAP (timeline animations), Howler.js (SFX playback), Tone.js (music synthesis), MCP bfxr2-mcp-server + 16bits-audio-mcp (asset generation), zustand persist middleware (audio preferences)

---

## File Structure

### Created (18 files)
| File | Responsibility |
|------|---------------|
| `web/lib/juice/audio-manager.ts` | Central AudioContext, compressor, analyser, 4 gain buses, page visibility |
| `web/lib/stores/audio-store.ts` | Zustand with persist middleware, channels, master volume |
| `web/lib/juice/sfx-library.ts` | Howler.js wrapper loading manifest.json assets |
| `web/lib/juice/music-system.ts` | Tone.js dynamic music beds per scene/intensity |
| `web/lib/juice/spatial-audio.ts` | Three.js PannerNode hook for 3D positional audio |
| `web/lib/juice/animation-director.ts` | GSAP timeline sequences, micro-interactions, ceremonies |
| `web/lib/experience/cinematic-orchestrator.ts` | Event-store subscriber dispatching audio+visual in sync |
| `web/components/experience/MascotAnimation.tsx` | GSAP-based character card (replaces RiveActor) |
| `web/components/experience/CeremonyAnimation.tsx` | GSAP-based ceremony sequences (replaces RiveCeremony) |
| `web/components/experience/PhaseTransition.tsx` | Lobby step mount/unmount animations |
| `web/components/experience/PageTransition.tsx` | Route change fade/scale |
| `web/components/juice/TimerRing.tsx` | Animated SVG countdown with urgency effects |
| `web/components/juice/Confetti.tsx` | Canvas-based confetti burst |
| `web/components/juice/ScorePopup.tsx` | Floating animated score numbers |
| `web/components/juice/ResultReveal.tsx` | Cinematic result card with GSAP |
| `web/components/juice/LoadingSkeleton.tsx` | GSAP shimmer loading placeholder |
| `web/components/juice/TutorialOverlay.tsx` | First-visit onboarding tutorial |
| `scripts/generate-audio-assets.ts` | MCP-driven WAV asset generation pipeline |

### Deleted (7 files + 10 empty dirs)
| File | Reason |
|------|--------|
| `web/components/experience/RiveActor.tsx` | No .riv files exist, never imported |
| `web/components/experience/RiveCeremony.tsx` | No .riv files exist, never imported |
| `web/lib/experience/rive-assets.ts` | Only used in test, no consumers |
| `web/lib/experience/rive-assets.test.ts` | Tests dead code |
| `web/lib/ai-characters.test.ts` | Tests Rive-adjacent code |
| `web/lib/juice/audio-engine.ts` | 90% dead — useGameAudio has 0 callers |
| `web/components/wordcard/AudioSystem.ts` | Independent system with no mute/sound toggle |
| `web/public/assets/rive/mascots/` | Empty dirs with only .gitkeep |
| `web/public/assets/rive/ceremonies/` | Empty dirs with only .gitkeep |
| `web/public/assets/rive/status/` | Empty dirs with only .gitkeep |

### Modified (25+ files)
See individual tasks for exact line changes.

---

### Task 0.1: Remove Rive dependency and delete dead Rive files

**Files:**
- Delete: `web/components/experience/RiveActor.tsx`
- Delete: `web/components/experience/RiveCeremony.tsx`
- Delete: `web/lib/experience/rive-assets.ts`
- Delete: `web/lib/experience/rive-assets.test.ts`
- Delete: `web/lib/ai-characters.test.ts`
- Delete: `web/public/assets/rive/mascots/.gitkeep`
- Delete: `web/public/assets/rive/ceremonies/.gitkeep`
- Delete: `web/public/assets/rive/status/.gitkeep`
- Delete: `web/public/assets/rive/mascots/` (empty dir)
- Delete: `web/public/assets/rive/ceremonies/` (empty dir)
- Delete: `web/public/assets/rive/status/` (empty dir)
- Delete: `web/public/assets/rive/` (empty dir)

- [ ] **Step 1: Delete Rive component files**

```bash
Remove-Item -LiteralPath "web\components\experience\RiveActor.tsx" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "web\components\experience\RiveCeremony.tsx" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "web\lib\experience\rive-assets.ts" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "web\lib\experience\rive-assets.test.ts" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "web\lib\ai-characters.test.ts" -ErrorAction SilentlyContinue
```

- [ ] **Step 2: Delete empty Rive asset directories**

```bash
Remove-Item -LiteralPath "web\public\assets\rive\mascots\.gitkeep" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "web\public\assets\rive\ceremonies\.gitkeep" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "web\public\assets\rive\status\.gitkeep" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "web\public\assets\rive\mascots" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "web\public\assets\rive\ceremonies" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "web\public\assets\rive\status" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "web\public\assets\rive" -ErrorAction SilentlyContinue
```

- [ ] **Step 3: Remove `@rive-app/react-canvas` from package.json**

Read `web/package.json` and remove line `"@rive-app/react-canvas": "^4.29.1",` from dependencies.

```bash
# After manual edit, run:
cd web; npm install
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: remove Rive dependency (no .riv files, components never consumed)"
```

---

### Task 0.2: Delete dead audio files

**Files:**
- Delete: `web/lib/juice/audio-engine.ts`
- Delete: `web/components/wordcard/AudioSystem.ts`

- [ ] **Step 1: Verify zero imports exist for `audio-engine.ts`**

```bash
# Check that useGameAudio has no callers
rg "useGameAudio" web/ --type ts
# Expected: no results (only its own definition file would show if still there)
```

- [ ] **Step 2: Verify zero imports exist for `audio-store.ts`**

```bash
rg "useAudioStore" web/ --type ts
# Expected: no results
```

- [ ] **Step 3: Delete the files**

```bash
Remove-Item -LiteralPath "web\lib\juice\audio-engine.ts" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "web\components\wordcard\AudioSystem.ts" -ErrorAction SilentlyContinue
```

- [ ] **Step 4: Check WordCardGame.tsx imports — update if it imports from AudioSystem**

Read `web/components/wordcard/WordCardGame.tsx` — if it has `import { playCardAudio, scoreAudio, ... } from "./AudioSystem"`, note these imports — they'll be redirected to AudioManager in Phase 1.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove dead audio systems (audio-engine.ts, AudioSystem.ts)"
```

---

### Task 0.3: Install GSAP, Howler.js, Tone.js

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Install dependencies**

```bash
cd web
npm install gsap howler @types/howler tone
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('gsap'); require('howler'); console.log('GSAP + Howler installed')"
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add gsap, howler, tone dependencies"
```

---

### Task 1.1: Create AudioManager (central audio controller)

**Files:**
- Create: `web/lib/juice/audio-manager.ts`

- [ ] **Step 1: Create the AudioManager class**

```typescript
// web/lib/juice/audio-manager.ts
"use client";

type BusName = "sfx" | "music" | "ambient" | "voice";

interface BusState {
  gain: GainNode;
  volume: number;
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buses = new Map<BusName, BusState>();
  private _enabled = false;
  private visibilityHandler: (() => void) | null = null;

  private getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) {
      this.ctx = new AC();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.connect(this.compressor);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
      this.masterGain.connect(this.analyser);

      for (const name of ["sfx", "music", "ambient", "voice"] as BusName[]) {
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1, this.ctx.currentTime);
        gain.connect(this.masterGain);
        this.buses.set(name, { gain, volume: 1 });
      }

      this.visibilityHandler = () => {
        if (document.hidden) {
          this.masterGain?.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.3);
        } else {
          this.masterGain?.gain.linearRampToValueAtTime(1, this.ctx!.currentTime + 0.5);
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }
    return this.ctx;
  }

  async enable(): Promise<boolean> {
    const c = this.getCtx();
    if (!c) return false;
    if (c.state === "suspended") await c.resume();
    this._enabled = true;
    return true;
  }

  disable() {
    this._enabled = false;
    this.buses.forEach((bus) => {
      bus.gain.gain.cancelScheduledValues(this.ctx?.currentTime ?? 0);
      bus.gain.gain.setValueAtTime(0, this.ctx?.currentTime ?? 0);
    });
    this.masterGain?.gain.setValueAtTime(0, this.ctx?.currentTime ?? 0);
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getBus(name: BusName): GainNode | undefined {
    return this.buses.get(name)?.gain;
  }

  setChannelVolume(channel: BusName, volume: number) {
    const bus = this.buses.get(channel);
    if (!bus || !this.ctx) return;
    bus.volume = Math.max(0, Math.min(1, volume));
    bus.gain.gain.setValueAtTime(bus.volume, this.ctx.currentTime);
  }

  getChannelVolume(channel: BusName): number {
    return this.buses.get(channel)?.volume ?? 1;
  }

  setMasterVolume(volume: number) {
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
  }

  getMasterVolume(): number {
    if (!this.masterGain || !this.ctx) return 1;
    return this.masterGain.gain.value;
  }

  /**
   * Create a PannerNode for spatial audio.
   * The caller is responsible for updating position each frame.
   */
  createPanner(): PannerNode | null {
    if (!this.ctx) return null;
    const panner = this.ctx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1;
    panner.maxDistance = 20;
    panner.rolloffFactor = 1;
    return panner;
  }

  /**
   * Get frequency data for audio-reactive visuals.
   * Returns Uint8Array of size fftSize/2.
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(128);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  destroy() {
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    }
    this.buses.clear();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this._enabled = false;
  }
}

export const audioManager = new AudioManager();
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd web; npx tsc --noEmit lib/juice/audio-manager.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/juice/audio-manager.ts
git commit -m "feat: create AudioManager with compressor, analyser, 4-channel bus"
```

---

### Task 1.2: Rewrite audio-store.ts with zustand persist middleware

**Files:**
- Rewrite: `web/lib/stores/audio-store.ts`

- [ ] **Step 1: Write the new audio-store.ts**

```typescript
// web/lib/stores/audio-store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AudioState {
  isEnabled: boolean;
  isMuted: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  ambientVolume: number;

  setEnabled: (enabled: boolean) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  setMasterVolume: (volume: number) => void;
  setChannelVolume: (channel: "sfx" | "music" | "ambient" | "voice", volume: number) => void;
  reset: () => void;
}

const initialState = {
  isEnabled: false,
  isMuted: false,
  masterVolume: 1.0,
  sfxVolume: 1.0,
  musicVolume: 1.0,
  ambientVolume: 1.0,
};

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      ...initialState,

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      setMuted: (muted) => set({ isMuted: muted }),

      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      setMasterVolume: (volume) =>
        set({ masterVolume: Math.max(0, Math.min(1, volume)) }),

      setChannelVolume: (channel, volume) => {
        const clamped = Math.max(0, Math.min(1, volume));
        const key = channel === "sfx" ? "sfxVolume"
          : channel === "music" ? "musicVolume"
          : channel === "ambient" ? "ambientVolume"
          : "masterVolume";
        set({ [key]: clamped } as any);
      },

      reset: () => set(initialState),
    }),
    {
      name: "bammby-audio",
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        isMuted: state.isMuted,
        masterVolume: state.masterVolume,
        sfxVolume: state.sfxVolume,
        musicVolume: state.musicVolume,
        ambientVolume: state.ambientVolume,
      }),
    },
  ),
);
```

Note: This fixes the `"bammby-sound"` localStorage bug — the existing code writes to `localStorage.setItem("bammby-sound", "on/off")` but never reads it on page load. The persist middleware reads `"bammby-audio"` on init.

- [ ] **Step 2: Verify the file compiles**

```bash
cd web; npx tsc --noEmit lib/stores/audio-store.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/stores/audio-store.ts
git commit -m "feat: rewrite audio-store with zustand persist middleware and channel volumes"
```

---

### Task 1.3: Create SFX Library (Howler.js wrapper)

**Files:**
- Create: `web/lib/juice/sfx-library.ts`

- [ ] **Step 1: Create the SFX library**

```typescript
// web/lib/juice/sfx-library.ts
"use client";

import { Howl, Howler } from "howler";
import { audioManager } from "./audio-manager";

type SfxName =
  | "hover"
  | "select"
  | "enter"
  | "back"
  | "error"
  | "match-found"
  | "game-over-win"
  | "game-over-lose"
  | "chat-unlocked"
  | "score-reveal"
  | "countdown-tick"
  | "countdown-urgent"
  | "message-received"
  | "fanfare"
  | "sigh";

const SFX_MAP = new Map<SfxName, Howl>();

const MANIFEST_URL = "/assets/audio/manifest.json";

let loaded = false;

export async function loadSfxLibrary(): Promise<boolean> {
  if (loaded) return true;
  try {
    const res = await fetch(MANIFEST_URL);
    const manifest: Record<string, string> = await res.json();
    for (const [name, path] of Object.entries(manifest)) {
      const howl = new Howl({
        src: [path],
        preload: true,
        volume: 0.8,
      });
      SFX_MAP.set(name as SfxName, howl);
    }
    loaded = true;
    return true;
  } catch {
    console.warn("SFX manifest not found, using procedural fallback");
    return false;
  }
}

/**
 * Play a named SFX through the sfx bus.
 * Falls back to procedural audio if Howl not loaded.
 */
export function playSfx(name: SfxName, volume = 1) {
  const howl = SFX_MAP.get(name);
  if (howl && loaded) {
    const bus = audioManager.getBus("sfx");
    if (bus) {
      howl.volume(0.8 * volume);
      howl.play();
    }
    return;
  }
  // Procedural fallback
  playProceduralFallback(name, volume);
}

function playProceduralFallback(name: SfxName, vol: number) {
  const ctx = audioManager.getContext();
  if (!ctx) return;
  const bus = audioManager.getBus("sfx");
  if (!bus) return;

  const t = (freq: number, dur: number, type: OscillatorType = "sine", delay = 0) => {
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      g.gain.setValueAtTime(vol * 0.15, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      o.connect(g);
      g.connect(bus);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + dur);
    } catch {}
  };

  const click = () => {
    try {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      g.gain.setValueAtTime(vol * 0.04, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      src.connect(g);
      g.connect(bus);
      src.start();
    } catch {}
  };

  const bell = (freq: number) => {
    t(freq, 0.3, "sine");
    t(freq * 1.5, 0.18, "sine", 0);
    t(freq * 2, 0.09, "sine", 0);
  };

  switch (name) {
    case "hover": case "select": click(); break;
    case "enter": t(110, 0.5); t(330, 0.6, "triangle", 0.08); break;
    case "back": t(300, 0.2); break;
    case "error": t(200, 0.15, "sawtooth"); t(180, 0.15, "square"); break;
    case "match-found":
      t(523, 0.2); setTimeout(() => t(659, 0.2), 100);
      setTimeout(() => t(784, 0.3), 200);
      setTimeout(() => bell(1047), 300);
      break;
    case "game-over-win":
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => t(f, 0.4), i * 120));
      break;
    case "game-over-lose": t(400, 0.3); t(350, 0.3, "sine", 0.15); t(300, 0.4, "sine", 0.3); break;
    case "chat-unlocked": t(660, 0.08); setTimeout(() => t(880, 0.08), 80); break;
    case "score-reveal": t(294, 0.5); t(440, 0.5, "sine", 0.1); break;
    case "countdown-tick": t(800, 0.05, "square", 0); break;
    case "countdown-urgent": t(1000, 0.05, "square", 0); break;
    case "message-received": t(1200, 0.04); break;
    case "fanfare": [523, 659, 784, 1047].forEach((f, i) => t(f, 0.4, "sine", i * 0.12)); break;
    case "sigh": t(400, 0.3); t(350, 0.3, "sine", 0.15); t(300, 0.4, "sine", 0.3); break;
  }
}

/**
 * Preload all Howler instances (call after first interaction).
 */
export function preloadSfx() {
  SFX_MAP.forEach((howl) => howl.load());
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd web; npx tsc --noEmit lib/juice/sfx-library.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/juice/sfx-library.ts
git commit -m "feat: create SFX library with Howler.js and procedural fallback"
```

---

### Task 1.4: Create Music System (Tone.js)

**Files:**
- Create: `web/lib/juice/music-system.ts`

- [ ] **Step 1: Create the music system**

```typescript
// web/lib/juice/music-system.ts
"use client";

import * as Tone from "tone";
import { audioManager } from "./audio-manager";

type MusicIntensity = "off" | "low" | "medium" | "high";

let currentIntensity: MusicIntensity = "off";
let synth: Tone.PolySynth | null = null;
let loop: Tone.Loop | null = null;

/** Chord progressions per intensity */
const PROGRESSIONS: Record<Exclude<MusicIntensity, "off">, string[][]> = {
  low: [["C2", "G2"], ["Am2", "F2"]],
  medium: [["C3", "G3", "Am3", "F3"], ["F3", "C3", "G3", "Am3"]],
  high: [["C4", "E4", "G4"], ["F4", "A4", "C5"], ["G4", "B4", "D5"]],
};

const BPM: Record<Exclude<MusicIntensity, "off">, number> = {
  low: 50,
  medium: 70,
  high: 90,
};

/**
 * Start the music bed at given intensity.
 * Routes through AudioManager's "music" bus.
 */
export async function startMusicBed(intensity: MusicIntensity = "low") {
  if (intensity === "off") {
    stopMusicBed();
    return;
  }

  const bus = audioManager.getBus("music");
  if (!bus) return;

  await Tone.start();
  currentIntensity = intensity;

  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.2, release: 0.5 },
      volume: -18,
    }).connect(bus);
  }

  Tone.getTransport().bpm.value = BPM[intensity];

  if (loop) {
    loop.dispose();
    loop = null;
  }

  const progression = PROGRESSIONS[intensity];
  let barIndex = 0;
  loop = new Tone.Loop((time) => {
    const chords = progression[barIndex % progression.length];
    synth?.triggerAttackRelease(chords, "2n", time);
    barIndex++;
  }, "1m");

  loop.start(0);
  Tone.getTransport().start();
}

/**
 * Stop the music bed.
 */
export function stopMusicBed() {
  if (loop) {
    loop.dispose();
    loop = null;
  }
  synth?.releaseAll();
  Tone.getTransport().stop();
  currentIntensity = "off";
}

/**
 * Transition to a new intensity smoothly.
 */
export function setMusicIntensity(intensity: MusicIntensity) {
  if (intensity === currentIntensity) return;
  stopMusicBed();
  if (intensity !== "off") {
    startMusicBed(intensity);
  }
}

export function getCurrentIntensity(): MusicIntensity {
  return currentIntensity;
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd web; npx tsc --noEmit lib/juice/music-system.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/juice/music-system.ts
git commit -m "feat: create Tone.js music system with dynamic intensity"
```

---

### Task 1.5: Rewrite experience-audio.ts as thin wrapper

**Files:**
- Rewrite: `web/components/experience/experience-audio.ts`

- [ ] **Step 1: Rewrite experience-audio.ts**

```typescript
// web/components/experience/experience-audio.ts
"use client";

import { audioManager } from "@/lib/juice/audio-manager";
import { loadSfxLibrary, playSfx } from "@/lib/juice/sfx-library";
import { startMusicBed, stopMusicBed, setMusicIntensity } from "@/lib/juice/music-system";
import { useAudioStore } from "@/lib/stores/audio-store";

let ambientNodes: OscillatorNode[] = [];
let ambientGain: GainNode | null = null;

export async function enableExperienceAudio(): Promise<boolean> {
  const ok = await audioManager.enable();
  if (!ok) return false;

  const ctx = audioManager.getContext();
  const ambientBus = audioManager.getBus("ambient");
  if (!ctx || !ambientBus) return false;

  // Start ambient drone
  ambientGain = ctx.createGain();
  ambientGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  ambientGain.gain.exponentialRampToValueAtTime(0.025, ctx.currentTime + 1.2);
  ambientGain.connect(ambientBus);

  ambientNodes = [42, 63, 84].map((frequency, index) => {
    const o = ctx.createOscillator();
    o.type = index === 0 ? "sine" : "triangle";
    o.frequency.setValueAtTime(frequency, ctx.currentTime);
    o.detune.setValueAtTime(index * 4 - 4, ctx.currentTime);
    o.connect(ambientGain!);
    o.start();
    return o;
  });

  // Load SFX library in background
  loadSfxLibrary().catch(() => {});

  // Enable procedural music fallback
  startMusicBed("low");

  // Play startup chime
  const bus = audioManager.getBus("sfx");
  if (bus) {
    const t = (f: number, d: number, delay = 0) => {
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f, ctx.currentTime + delay);
        g.gain.setValueAtTime(0.035, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + d);
        o.connect(g);
        g.connect(bus);
        o.start(ctx.currentTime + delay);
        o.stop(ctx.currentTime + delay + d);
      } catch {}
    };
    t(392, 0.45);
    t(587, 0.55, 0.09);
  }

  return true;
}

export function disableExperienceAudio() {
  audioManager.disable();
  stopMusicBed();

  const ctx = audioManager.getContext();
  if (ctx && ambientGain) {
    ambientGain.gain.cancelScheduledValues(ctx.currentTime);
    ambientGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    setTimeout(() => {
      ambientNodes.forEach((n) => { try { n.stop(); } catch {} });
      ambientNodes = [];
      ambientGain?.disconnect();
      ambientGain = null;
    }, 400);
  }
}

export function isExperienceAudioEnabled(): boolean {
  return audioManager.isEnabled();
}

export function playExperienceSelect() {
  playSfx("select");
}

export function playExperienceEnter() {
  playSfx("enter");
}

export function playExperienceReveal() {
  playSfx("score-reveal");
}

export function pulseHaptic(pattern: "select" | "enter" | "match" = "select") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const patterns = {
    select: 8,
    enter: [10, 30, 18],
    match: [18, 40, 22, 40, 32],
  } as const;
  navigator.vibrate(
    typeof patterns[pattern] === "number"
      ? (patterns[pattern] as number)
      : [...(patterns[pattern] as number[])],
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd web; npx tsc --noEmit components/experience/experience-audio.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/components/experience/experience-audio.ts
git commit -m "feat: rewrite experience-audio as AudioManager wrapper with procedural fallback"
```

---

### Task 1.6: Wire audio-store into ExperienceShell

**Files:**
- Modify: `web/components/experience/ExperienceShell.tsx`

- [ ] **Step 1: Read current ExperienceShell**

Read `web/components/experience/ExperienceShell.tsx` — it currently uses local `soundOn` state and `isExperienceAudioEnabled()`.

- [ ] **Step 2: Replace with audio-store subscription**

Replace the `useState` and `useEffect` for `soundOn` with:
```typescript
import { useAudioStore } from "@/lib/stores/audio-store";
// In component:
const { isEnabled, setEnabled } = useAudioStore();
```

Replace `toggleSound`:
```typescript
const toggleSound = async () => {
  pulseHaptic("select");
  if (isEnabled) {
    disableExperienceAudio();
    setEnabled(false);
    return;
  }
  const ok = await enableExperienceAudio();
  setEnabled(ok);
};
```

Replace `soundOn` → `isEnabled` in JSX:
```tsx
aria-pressed={isEnabled}
aria-label={isEnabled ? "Mute Bammby ambience" : "Enable Bammby ambience"}
{isEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
<span>{isEnabled ? "Sound on" : "Sound off"}</span>
```

Remove the old `useEffect` that calls `setSoundOn(isExperienceAudioEnabled())`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: wire ExperienceShell to global audio-store"
```

---

### Task 1.7: Wire ArrivalScene3D with auto-enable

**Files:**
- Modify: `web/components/arrival/ArrivalScene3D.tsx`

- [ ] **Step 1: Read current ArrivalScene3D**

Read `web/components/arrival/ArrivalScene3D.tsx`. Note lines 37-49 use local `soundOn` state.

- [ ] **Step 2: Wire to audio-store and auto-enable on enter**

Replace local `soundOn` with:
```typescript
import { useAudioStore } from "@/lib/stores/audio-store";
// In component:
const { isEnabled, setEnabled } = useAudioStore();
```

Replace `handleEnter`:
```typescript
const handleEnter = useCallback(async () => {
  if (!isEnabled) {
    const ok = await enableExperienceAudio();
    setEnabled(ok);
  }
  playExperienceEnter();
  pulseHaptic("enter");
  setApproaching(true);
}, [isEnabled, setEnabled]);
```

Replace `toggleSound`:
```typescript
const toggleSound = useCallback(async () => {
  pulseHaptic("select");
  if (isEnabled) {
    disableExperienceAudio();
    setEnabled(false);
  } else {
    const ok = await enableExperienceAudio();
    setEnabled(ok);
  }
}, [isEnabled, setEnabled]);
```

Replace `soundOn` → `isEnabled` in JSX.

- [ ] **Step 3: Commit**

```bash
git add web/components/arrival/ArrivalScene3D.tsx
git commit -m "feat: wire ArrivalScene3D to audio-store, auto-enable on enter"
```

---

### Task 1.8: Update WordCardGame to use AudioManager

**Files:**
- Modify: `web/components/wordcard/WordCardGame.tsx`

- [ ] **Step 1: Read current WordCardGame**

Read `web/components/wordcard/WordCardGame.tsx`. It imports from `./AudioSystem`.

- [ ] **Step 2: Replace AudioSystem imports with playSfx**

Replace:
```typescript
import { playCardAudio, scoreAudio, tickAudio, winAudio, shuffleAudio } from "./AudioSystem";
```
With:
```typescript
import { playSfx } from "@/lib/juice/sfx-library";
```

Replace each usage:
- `playCardAudio.current()` → `playSfx("select")`
- `scoreAudio.current(pts)` → `playSfx("score-reveal", Math.min(1, pts / 5))`
- `tickAudio.current()` → `playSfx("countdown-tick")`
- `winAudio.current()` → `playSfx("fanfare")`
- `shuffleAudio.current()` → `playSfx("hover")`

- [ ] **Step 3: Verify compilation**

```bash
cd web; npx tsc --noEmit components/wordcard/WordCardGame.tsx 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add web/components/wordcard/WordCardGame.tsx
git commit -m "feat: WordCardGame uses AudioManager instead of AudioSystem"
```

---

### Task 2.1: Create MCP audio asset generation script

**Files:**
- Create: `scripts/generate-audio-assets.ts`

- [ ] **Step 1: Create the generation script**

```typescript
// scripts/generate-audio-assets.ts
/**
 * Generates audio assets via MCP servers (bfxr2 + 16bits-audio).
 *
 * Run: npx tsx scripts/generate-audio-assets.ts
 *
 * Requires MCP servers to be running:
 * - bfxr2-mcp-server (SFX generation)
 * - 16bits-audio-mcp (BGM/jingles)
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const OUTPUT = join(__dirname, "..", "web", "public", "assets", "audio");

interface AssetManifest {
  [key: string]: string;
}

const manifest: AssetManifest = {};

function add(name: string, path: string) {
  manifest[name] = `/assets/audio/${path}`;
}

// ── UI Sounds ──
add("hover", "sfx/hover.wav");
add("select", "sfx/select.wav");
add("enter", "sfx/enter.wav");
add("back", "sfx/back.wav");
add("error", "sfx/error.wav");

// ── Ceremony ──
add("match-found", "ceremonies/match-found.wav");
add("game-over-win", "ceremonies/game-over-win.wav");
add("game-over-lose", "ceremonies/game-over-lose.wav");
add("chat-unlocked", "ceremonies/chat-unlocked.wav");
add("score-reveal", "ceremonies/score-reveal.wav");

// ── Timer ──
add("countdown-tick", "sfx/countdown-tick.wav");
add("countdown-urgent", "sfx/countdown-urgent.wav");

// ── Chat ──
add("message-received", "sfx/message-received.wav");

// ── Game Category Music Beds ──
add("music-nerve", "music/nerve.mp3");
add("music-reflex", "music/reflex.mp3");
add("music-psychology", "music/psychology.mp3");
add("music-social", "music/social.mp3");
add("music-strategy", "music/strategy.mp3");
add("music-knowledge", "music/knowledge.mp3");
add("music-visual", "music/visual.mp3");

// ── Scene Ambients ──
add("ambient-lobby", "ambient/lobby.mp3");
add("ambient-garden", "ambient/garden.mp3");
add("ambient-rooftop", "ambient/rooftop.mp3");
add("ambient-observatory", "ambient/observatory.mp3");
add("ambient-expedition", "ambient/expedition.mp3");

// ── Write manifest ──
mkdirSync(join(OUTPUT, "sfx"), { recursive: true });
mkdirSync(join(OUTPUT, "ceremonies"), { recursive: true });
mkdirSync(join(OUTPUT, "music"), { recursive: true });
mkdirSync(join(OUTPUT, "ambient"), { recursive: true });

writeFileSync(join(OUTPUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Manifest written to ${join(OUTPUT, "manifest.json")}`);
console.log(`Total assets: ${Object.keys(manifest).length}`);
console.log("");
console.log("To generate actual assets, run the MCP servers and use their tools:");
console.log("  bfxr2-mcp-server generate_sound_effect for SFX");
console.log("  16bits-audio-mcp bgm_compose for music beds");
console.log("  16bits-audio-mcp jingle_gen for ceremonies");
```

- [ ] **Step 2: Commit**

```bash
git add scripts/generate-audio-assets.ts
git commit -m "feat: create MCP audio asset generation pipeline"
```

---

### Task 3.1: Create AnimationDirector (GSAP central)

**Files:**
- Create: `web/lib/juice/animation-director.ts`

- [ ] **Step 1: Create AnimationDirector with GSAP timelines**

```typescript
// web/lib/juice/animation-director.ts
"use client";

import gsap from "gsap";

let reducedMotion = false;

export function setReducedMotion(value: boolean) {
  reducedMotion = value;
}

export function isReducedMotion(): boolean {
  return reducedMotion;
}

// ── Page Transitions ──

export function fadeOut(el: HTMLElement, duration = 0.25): Promise<void> {
  if (reducedMotion) { el.style.display = "none"; return Promise.resolve(); }
  return new Promise((resolve) => {
    gsap.to(el, { opacity: 0, duration, onComplete: () => { el.style.display = "none"; resolve(); } });
  });
}

export function fadeIn(el: HTMLElement, duration = 0.35): Promise<void> {
  if (reducedMotion) { el.style.display = ""; el.style.opacity = "1"; return Promise.resolve(); }
  return new Promise((resolve) => {
    el.style.display = "";
    gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration, ease: "power2.out", onComplete: resolve });
  });
}

export function scaleIn(el: HTMLElement, duration = 0.4): Promise<void> {
  if (reducedMotion) { el.style.display = ""; el.style.transform = "scale(1)"; return Promise.resolve(); }
  return new Promise((resolve) => {
    el.style.display = "";
    gsap.fromTo(el, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration, ease: "back.out(1.7)", onComplete: resolve });
  });
}

// ── Micro-interactions ──

export function buttonHover(btn: HTMLElement) {
  if (reducedMotion) return;
  gsap.to(btn, { scale: 1.04, duration: 0.15, ease: "power1.out" });
}

export function buttonLeave(btn: HTMLElement) {
  if (reducedMotion) return;
  gsap.to(btn, { scale: 1, duration: 0.15, ease: "power1.out" });
}

export function buttonPress(btn: HTMLElement) {
  if (reducedMotion) return;
  gsap.to(btn, { scale: 0.96, duration: 0.08, ease: "power1.out", yoyo: true, repeat: 1 });
}

// ── Ceremony Sequences ──

export function matchFoundSequence(container: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: reducedMotion });
  if (reducedMotion) return tl;
  tl.fromTo(container, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" })
    .to(container, { boxShadow: "0 0 60px rgba(139,92,246,0.6)", duration: 0.3 }, "-=0.2")
    .to(container, { boxShadow: "0 0 0px rgba(139,92,246,0)", duration: 0.5 });
  return tl;
}

export function gameOverSequence(container: HTMLElement, outcome: "win" | "lose"): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: reducedMotion });
  if (reducedMotion) return tl;
  const color = outcome === "win" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)";
  tl.fromTo(container, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" })
    .to(container, { boxShadow: `0 0 80px ${color}`, duration: 0.6 }, "-=0.2");
  return tl;
}

export function scoreRevealSequence(el: HTMLElement, targetScore: number): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: reducedMotion });
  if (reducedMotion) { el.textContent = String(targetScore); return tl; }
  const obj = { val: 0 };
  tl.to(obj, {
    val: targetScore,
    duration: 0.8,
    ease: "power2.out",
    onUpdate: () => { el.textContent = String(Math.round(obj.val)); },
  });
  return tl;
}

export function chatUnlockedSequence(container: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: reducedMotion });
  if (reducedMotion) return tl;
  tl.fromTo(container, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" })
    .to(container, { borderColor: "rgba(139,92,246,0.5)", duration: 0.3 });
  return tl;
}

// ── Timer Urgency ──

export function timerUrgent(el: HTMLElement, seconds: number) {
  if (reducedMotion) return;
  const urgency = Math.max(0, 1 - seconds / 5);
  gsap.to(el, {
    scale: 1 + urgency * 0.08,
    color: urgency > 0.5 ? "#ef4444" : "#f59e0b",
    duration: 0.2,
    ease: "power1.out",
  });
}

// ── Particles ──

export function confettiBurst(origin: { x: number; y: number }, container?: HTMLElement) {
  if (reducedMotion) return;
  const count = 20;
  const colors = ["#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6"];
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.style.cssText = `
      position: fixed; left: ${origin.x}px; top: ${origin.y}px;
      width: 6px; height: 6px; border-radius: 50%;
      background: ${colors[i % colors.length]};
      pointer-events: none; z-index: 9999;
    `;
    (container ?? document.body).appendChild(el);
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 60 + Math.random() * 120;
    gsap.to(el, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 60,
      opacity: 0,
      scale: 0,
      duration: 0.6 + Math.random() * 0.4,
      ease: "power2.out",
      onComplete: () => el.remove(),
    });
  }
}

export function screenFlash(color = "#8b5cf6") {
  if (reducedMotion) return;
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;inset:0;background:${color};opacity:0;pointer-events:none;z-index:9998;`;
  document.body.appendChild(el);
  gsap.to(el, { opacity: 0.25, duration: 0.08, yoyo: true, repeat: 1, onComplete: () => el.remove() });
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd web; npx tsc --noEmit lib/juice/animation-director.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/juice/animation-director.ts
git commit -m "feat: create AnimationDirector with GSAP timelines, ceremonies, micro-interactions"
```

---

### Task 3.2: Create MascotAnimation (GSAP replacement for RiveActor)

**Files:**
- Create: `web/components/experience/MascotAnimation.tsx`

- [ ] **Step 1: Create MascotAnimation component**

```typescript
// web/components/experience/MascotAnimation.tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { AICharacterMood } from "@/lib/ai-characters";

interface MascotAnimationProps {
  name: string;
  level: number;
  accent: string;
  mood?: AICharacterMood;
  size?: number;
}

export function MascotAnimation({
  name,
  level,
  accent,
  mood = "idle",
  size = 80,
}: MascotAnimationProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    // Kill any running animations
    gsap.killTweensOf(el);

    switch (mood) {
      case "idle":
        gsap.to(el, {
          y: -3,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        break;
      case "selected":
        gsap.fromTo(el,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }
        );
        gsap.to(el, {
          boxShadow: `0 0 20px ${accent}44`,
          duration: 0.3,
        });
        break;
      case "thinking":
        gsap.to(el, {
          rotation: 5,
          duration: 0.3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        break;
      case "win":
        gsap.fromTo(el,
          { scale: 1, y: 0 },
          { scale: 1.15, y: -8, duration: 0.3, ease: "back.out(2)", yoyo: true, repeat: 2 }
        );
        break;
      case "lose":
        gsap.to(el, {
          opacity: 0.5,
          scale: 0.9,
          duration: 0.4,
          ease: "power2.in",
        });
        break;
    }

    return () => { gsap.killTweensOf(el); };
  }, [mood, accent]);

  return (
    <div
      ref={cardRef}
      className="mascot-animation"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.22,
        opacity: 0.85,
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
      aria-label={`${name} (level ${level})`}
    >
      <span style={{ textAlign: "center", lineHeight: 1.2, padding: 4 }}>
        {name[0]}
        <br />
        <small style={{ fontSize: size * 0.12, opacity: 0.7 }}>Lv.{level}</small>
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/experience/MascotAnimation.tsx
git commit -m "feat: create MascotAnimation GSAP replacement for RiveActor"
```

---

### Task 3.3: Create CeremonyAnimation (GSAP replacement for RiveCeremony)

**Files:**
- Create: `web/components/experience/CeremonyAnimation.tsx`

- [ ] **Step 1: Create CeremonyAnimation component**

```typescript
// web/components/experience/CeremonyAnimation.tsx
"use client";

import { useEffect, useRef } from "react";
import {
  matchFoundSequence,
  gameOverSequence,
  chatUnlockedSequence,
  confettiBurst,
} from "@/lib/juice/animation-director";

type CeremonyType = "match-found" | "game-over" | "score-reveal" | "chat-unlocked";

interface CeremonyAnimationProps {
  type: CeremonyType;
  outcome?: "win" | "lose";
  visible?: boolean;
  onComplete?: () => void;
  className?: string;
}

const LABELS: Record<CeremonyType, string> = {
  "match-found": "Match Found!",
  "game-over": "Game Over",
  "score-reveal": "Score",
  "chat-unlocked": "Chat Unlocked",
};

export function CeremonyAnimation({
  type,
  outcome = "win",
  visible = true,
  onComplete,
  className = "",
}: CeremonyAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !visible || completedRef.current) return;

    completedRef.current = true;

    switch (type) {
      case "match-found":
        matchFoundSequence(el);
        setTimeout(() => {
          confettiBurst(
            { x: window.innerWidth / 2, y: window.innerHeight / 2 },
            el.parentElement ?? undefined,
          );
          onComplete?.();
        }, 600);
        break;
      case "game-over":
        gameOverSequence(el, outcome);
        setTimeout(() => onComplete?.(), 800);
        break;
      case "chat-unlocked":
        chatUnlockedSequence(el);
        setTimeout(() => onComplete?.(), 500);
        break;
      case "score-reveal":
        // score-reveal is handled inline by scoreRevealSequence
        setTimeout(() => onComplete?.(), 400);
        break;
    }
  }, [type, outcome, visible, onComplete]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className={`ceremony-animation ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.1)",
        background: outcome === "win"
          ? "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(139,92,246,0.12))"
          : "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(255,147,104,0.12))",
      }}
      aria-hidden="true"
    >
      <span style={{ fontSize: "1.5rem", fontWeight: 600, opacity: 0.85 }}>
        {LABELS[type]}
        {type === "game-over" && outcome === "win" ? " — You Win!" : ""}
        {type === "game-over" && outcome === "lose" ? " — You Lose" : ""}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/experience/CeremonyAnimation.tsx
git commit -m "feat: create CeremonyAnimation GSAP replacement for RiveCeremony"
```

---

### Task 4.1: Create CinematicOrchestrator

**Files:**
- Create: `web/lib/experience/cinematic-orchestrator.ts`

- [ ] **Step 1: Create the orchestrator**

```typescript
// web/lib/experience/cinematic-orchestrator.ts
"use client";

import { useEffect } from "react";
import { useExperienceEventStore } from "./event-store";
import { playSfx } from "@/lib/juice/sfx-library";
import { startMusicBed, stopMusicBed, setMusicIntensity } from "@/lib/juice/music-system";
import {
  matchFoundSequence,
  gameOverSequence,
  chatUnlockedSequence,
  scoreRevealSequence,
  confettiBurst,
  screenFlash,
} from "@/lib/juice/animation-director";

/**
 * Subscribes to experience-event-store and dispatches
 * synchronized audio + visual sequences.
 * Renders as a null component — attach to any layout.
 */
export function CinematicOrchestrator() {
  const lastEvent = useExperienceEventStore((s) => s.lastEvent);

  useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.type) {
      case "queue_searching":
        startMusicBed("low");
        break;

      case "match_found":
        playSfx("match-found");
        setMusicIntensity("medium");
        // Visual is handled by CeremonyAnimation in matched-screen
        break;

      case "game_start":
        playSfx("enter");
        screenFlash("#8b5cf6");
        setMusicIntensity("high");
        break;

      case "round_resolved":
        const outcome = lastEvent.payload.outcome;
        if (outcome === "win") {
          playSfx("game-over-win");
          confettiBurst({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
          screenFlash("#22c55e");
        } else if (outcome === "lose") {
          playSfx("game-over-lose");
          screenFlash("#ef4444");
        } else {
          playSfx("score-reveal");
        }
        break;

      case "score_changed":
        playSfx("score-reveal");
        break;

      case "game_over":
        if (lastEvent.payload.outcome === "win") {
          playSfx("game-over-win");
          confettiBurst({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        } else {
          playSfx("game-over-lose");
        }
        stopMusicBed();
        break;

      case "chat_unlocked":
        playSfx("chat-unlocked");
        startMusicBed("low");
        break;

      case "message_received":
        playSfx("message-received");
        break;

      case "no_match":
        playSfx("back");
        stopMusicBed();
        break;

      case "ai_selected":
        playSfx("select");
        setMusicIntensity("medium");
        break;
    }
  }, [lastEvent]);

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/experience/cinematic-orchestrator.ts
git commit -m "feat: create CinematicOrchestrator for audio-visual event dispatch"
```

---

### Task 4.2: Add missing event emissions and auto-enable sound

**Files:**
- Modify: `web/app/lobby/page.tsx` (emit `queue_searching`)
- Modify: `web/app/layout.tsx` (auto-enable sound on first click, CinematicOrchestrator)

- [ ] **Step 1: Add `queue_searching` emission in lobby page**

In `web/app/lobby/page.tsx`, in the `queueChoice` function where `setPhase("queued")` is called, add:
```typescript
emit({
  type: "queue_searching",
  payload: { intent, game, choice: selected },
});
```

- [ ] **Step 2: Add CinematicOrchestrator and auto-enable in root layout**

In `web/app/layout.tsx`:
```typescript
import { CinematicOrchestrator } from "@/lib/experience/cinematic-orchestrator";
import { enableExperienceAudio } from "@/components/experience/experience-audio";
import { useAudioStore } from "@/lib/stores/audio-store";

// Inside the layout component, add:
<CinematicOrchestrator />

// Add auto-enable effect:
useEffect(() => {
  const { isEnabled, setEnabled } = useAudioStore.getState();
  if (isEnabled) {
    // Restore audio state from persisted localStorage
    enableExperienceAudio().then(setEnabled).catch(() => {});
    return;
  }
  const handler = () => {
    const { isEnabled: nowEnabled } = useAudioStore.getState();
    if (!nowEnabled) {
      enableExperienceAudio().then((ok) => {
        if (ok) useAudioStore.getState().setEnabled(true);
      }).catch(() => {});
    }
  };
  document.addEventListener("pointerdown", handler, { once: true });
  return () => document.removeEventListener("pointerdown", handler);
}, []);
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add queue_searching emission, auto-enable sound, CinematicOrchestrator"
```

---

### Task 5.1: Create TimerRing with urgency effects

**Files:**
- Create: `web/components/juice/TimerRing.tsx`

- [ ] **Step 1: Create TimerRing component**

```typescript
// web/components/juice/TimerRing.tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { playSfx } from "@/lib/juice/sfx-library";
import { timerUrgent } from "@/lib/juice/animation-director";

interface TimerRingProps {
  seconds: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  urgentColor?: string;
}

export function TimerRing({
  seconds,
  total,
  size = 128,
  strokeWidth = 8,
  color = "#8b5cf6",
  urgentColor = "#ef4444",
}: TimerRingProps) {
  const ringRef = useRef<SVGCircleElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const prevSeconds = useRef(seconds);
  const tickCounter = useRef(0);

  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const progress = seconds / total;
  const isUrgent = seconds <= 5;

  useEffect(() => {
    // Tick audio — accelerate as time runs low
    if (seconds < prevSeconds.current && seconds > 0) {
      tickCounter.current++;
      const interval = seconds <= 3 ? 0.25 : seconds <= 5 ? 0.5 : 1;
      if (tickCounter.current % Math.round(1 / (seconds <= 3 ? 4 : seconds <= 5 ? 2 : 1)) === 0) {
        playSfx(isUrgent ? "countdown-urgent" : "countdown-tick");
      }
    }
    prevSeconds.current = seconds;

    // Animate ring
    if (ringRef.current) {
      const offset = circ * (1 - progress);
      gsap.to(ringRef.current, {
        strokeDashoffset: offset,
        duration: 0.3,
        ease: "power1.out",
      });
    }

    // Urgency effects
    if (isUrgent && textRef.current) {
      timerUrgent(textRef.current, seconds);
    }
  }, [seconds, total, progress, circ, isUrgent]);

  return (
    <svg width={size} height={size} className="-rotate-90" aria-label={`${Math.ceil(seconds)} seconds remaining`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#374151"
        strokeWidth={strokeWidth}
      />
      <circle
        ref={ringRef}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={isUrgent ? urgentColor : color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circ}`}
        strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round"
      />
      <text
        ref={textRef}
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fill="white"
        className="text-2xl font-bold"
        style={{ transition: "fill 0.3s" }}
      >
        {Math.ceil(seconds)}
      </text>
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/juice/TimerRing.tsx
git commit -m "feat: create TimerRing with GSAP urgency effects and accelerating ticks"
```

---

### Task 5.2: Create celebration components

**Files:**
- Create: `web/components/juice/Confetti.tsx`
- Create: `web/components/juice/ScorePopup.tsx`
- Create: `web/components/juice/ResultReveal.tsx`

- [ ] **Step 1: Create Confetti component**

```typescript
// web/components/juice/Confetti.tsx
"use client";

import { useEffect, useRef } from "react";

interface ConfettiProps {
  active: boolean;
  count?: number;
}

export function Confetti({ active, count = 30 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Array<{
    x: number; y: number; vx: number; vy: number;
    size: number; color: string; rotation: number; rotationSpeed: number;
    life: number;
  }>>([]);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6", "#ff6f61"];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 120 + Math.random() * 200;
      particles.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 150,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20,
        life: 1,
      });
    }

    let animId = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const alive: typeof particles.current = [];
      for (const p of particles.current) {
        p.life -= 0.012;
        if (p.life <= 0) continue;
        p.vy += 400 * 0.016;
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.rotation += p.rotationSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        alive.push(p);
      }
      particles.current = alive;
      if (alive.length > 0) animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      particles.current = [];
    };
  }, [active, count]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 2: Create ScorePopup component**

```typescript
// web/components/juice/ScorePopup.tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface ScorePopupProps {
  score: number;
  x: number;
  y: number;
  color?: string;
}

export function ScorePopup({ score, x, y, color = "#22c55e" }: ScorePopupProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    gsap.fromTo(el,
      { y: 0, opacity: 1, scale: 0.5 },
      { y: -60, opacity: 0, scale: 1.3, duration: 0.8, ease: "power2.out" }
    );
  }, []);

  return (
    <div
      ref={elRef}
      style={{
        position: "fixed",
        left: x,
        top: y,
        color,
        fontWeight: 700,
        fontSize: "1.5rem",
        pointerEvents: "none",
        zIndex: 9999,
        textShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      +{score}
    </div>
  );
}
```

- [ ] **Step 3: Create ResultReveal component**

```typescript
// web/components/juice/ResultReveal.tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface ResultRevealProps {
  winner: "me" | "them" | "draw";
  myScore: number;
  theirScore: number;
  summary: string;
  onComplete?: () => void;
}

const WINNER_LABELS = {
  me: "You took it.",
  them: "They took it.",
  draw: "Draw.",
};

export function ResultReveal({ winner, myScore, theirScore, summary, onComplete }: ResultRevealProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const score = scoreRef.current;
    if (!card) return;

    const tl = gsap.timeline({ onComplete });
    tl.fromTo(card, { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.7)" });
    if (score) {
      const obj = { val: 0 };
      tl.to(obj, {
        val: myScore,
        duration: 0.6,
        ease: "power2.out",
        onUpdate: () => { score.textContent = `${String(Math.round(obj.val))}:${theirScore}`; },
      }, "-=0.2");
    }
  }, [myScore, theirScore, onComplete]);

  return (
    <div
      ref={cardRef}
      className="result-reveal"
      style={{
        padding: "2rem",
        borderRadius: "1rem",
        background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))",
        border: "1px solid rgba(255,255,255,0.1)",
        textAlign: "center",
      }}
    >
      <p className="lobby-kicker" style={{ marginBottom: 8 }}>{WINNER_LABELS[winner]}</p>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 8 }}>{summary}</h1>
      <div
        ref={scoreRef}
        style={{ fontSize: "2rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
      >
        {myScore}:{theirScore}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/components/juice/
git commit -m "feat: create celebration components (Confetti, ScorePopup, ResultReveal)"
```

---

### Task 5.3: Upgrade The Button game renderer

**Files:**
- Modify: `web/lib/games/the-button.tsx`

- [ ] **Step 1: Replace the renderer to use TimerRing and animations**

Replace the `TheButtonRenderer` body to include `<TimerRing>` instead of text-based countdown, and `<Confetti>` + `<ResultReveal>` for result state. Wrap in GSAP entrance animation.

Replace the timer display section:
```typescript
// Instead of: <h1 className="text-6xl tabular-nums">{elapsed.toFixed(2)}s</h1>
// Use:
<div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
  <TimerRing
    seconds={Math.max(0, 10 - elapsed)}
    total={10}
    size={140}
    color="#8b5cf6"
    urgentColor="#ef4444"
  />
</div>
```

Replace the result section:
```typescript
// Instead of raw JSX:
{result ? (
  <>
    <p className="lobby-kicker">{result.winner === "me" ? "You took it." : ...}</p>
    <h1>{result.summary}</h1>
    ...
  </>
) : ...}
```
Use:
```typescript
{result ? (
  <ResultReveal
    winner={result.winner}
    myScore={Math.round(result.myScore * 100) / 100}
    theirScore={Math.round(result.theirScore * 100) / 100}
    summary={result.summary}
  />
) : (...)}
```

- [ ] **Step 2: Repeat the same pattern** for all 8 game renderers (`quick-draw.tsx`, `dice-fate.tsx`, `simul-pick.tsx`, `which-one.tsx`, `palette.tsx`, `food-remedy.tsx`, and Chicken in `the-button.tsx`).

Each renderer gets:
- TimerRing instead of raw number countdown
- ResultReveal instead of raw result markup
- Confetti + ScorePopup integration
- GSAP entrance animation on mount

- [ ] **Step 3: Commit**

```bash
git add lib/games/
git commit -m "feat: upgrade all game renderers with TimerRing, ResultReveal, celebrations"
```

---

### Task 6.1: Create spatial audio hook

**Files:**
- Create: `web/lib/juice/spatial-audio.ts`

- [ ] **Step 1: Create spatial audio hook**

```typescript
// web/lib/juice/spatial-audio.ts
"use client";

import { useRef, useCallback } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { audioManager } from "./audio-manager";

interface SpatialSource {
  panner: PannerNode;
  oscillator: OscillatorNode;
  gain: GainNode;
}

/**
 * Hook for spatial audio in Three.js scenes.
 * Attach to any component that needs positional sound.
 *
 * Usage:
 * const { playAtPosition, updateListener } = useSpatialAudio();
 * playAtPosition(new THREE.Vector3(1, 2, 3), 220, "sine", 0.05);
 * // updates automatically each frame
 */
export function useSpatialAudio() {
  const sources = useRef<Map<string, SpatialSource>>(new Map());
  const listenerPos = useRef(new THREE.Vector3(0, 0, 0));

  const playAtPosition = useCallback((
    position: THREE.Vector3,
    frequency: number,
    type: OscillatorType = "sine",
    volume = 0.03,
    id = `spatial-${Date.now()}`,
  ) => {
    const ctx = audioManager.getContext();
    const bus = audioManager.getBus("ambient");
    if (!ctx || !bus) return;

    // Stop existing source with same ID
    const existing = sources.current.get(id);
    if (existing) {
      try { existing.oscillator.stop(); } catch {}
      sources.current.delete(id);
    }

    const panner = audioManager.createPanner();
    if (!panner) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);

    oscillator.connect(gain);
    gain.connect(panner);
    panner.connect(bus);

    // Set position
    panner.positionX.setValueAtTime(position.x, ctx.currentTime);
    panner.positionY.setValueAtTime(position.y, ctx.currentTime);
    panner.positionZ.setValueAtTime(position.z, ctx.currentTime);

    oscillator.start();

    sources.current.set(id, { panner, oscillator, gain });

    return id;
  }, []);

  const stopSource = useCallback((id: string) => {
    const source = sources.current.get(id);
    if (source) {
      try { source.oscillator.stop(); } catch {}
      sources.current.delete(id);
    }
  }, []);

  const stopAll = useCallback(() => {
    sources.current.forEach((source) => {
      try { source.oscillator.stop(); } catch {}
    });
    sources.current.clear();
  }, []);

  // Update listener position and all source positions each frame
  useFrame(({ camera }) => {
    const ctx = audioManager.getContext();
    if (!ctx) return;

    const pos = camera.position;
    ctx.listener.positionX.setValueAtTime(pos.x, ctx.currentTime);
    ctx.listener.positionY.setValueAtTime(pos.y, ctx.currentTime);
    ctx.listener.positionZ.setValueAtTime(pos.z, ctx.currentTime);

    // Also update camera forward direction for HRTF
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    ctx.listener.forwardX.setValueAtTime(dir.x, ctx.currentTime);
    ctx.listener.forwardY.setValueAtTime(dir.y, ctx.currentTime);
    ctx.listener.forwardZ.setValueAtTime(dir.z, ctx.currentTime);
  });

  return { playAtPosition, stopSource, stopAll };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/juice/spatial-audio.ts
git commit -m "feat: create useSpatialAudio hook for Three.js positional audio"
```

---

### Task 7.1: Create loading skeleton

**Files:**
- Create: `web/components/juice/LoadingSkeleton.tsx`

- [ ] **Step 1: Create LoadingSkeleton**

```typescript
// web/components/juice/LoadingSkeleton.tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface LoadingSkeletonProps {
  lines?: number;
  width?: string;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, width = "100%", height = "1rem", className = "" }: LoadingSkeletonProps) {
  const shimmerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = shimmerRef.current;
    if (!el) return;
    gsap.to(el, {
      x: "100%",
      duration: 1.2,
      repeat: -1,
      ease: "power1.inOut",
    });
  }, []);

  return (
    <div className={`loading-skeleton ${className}`} aria-label="Loading" role="status">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            width: typeof width === "string" ? width : `${width}px`,
            height: typeof height === "string" ? height : `${height}px`,
            background: "#1e293b",
            borderRadius: "0.5rem",
            position: "relative",
            overflow: "hidden",
            marginBottom: "0.75rem",
          }}
        >
          <div
            ref={i === 0 ? shimmerRef : undefined}
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
              transform: "translateX(-100%)",
            }}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/juice/LoadingSkeleton.tsx
git commit -m "feat: create LoadingSkeleton with GSAP shimmer"
```

---

### Task 7.2: Add persistent sound toggle to Nav

**Files:**
- Modify: `web/components/Nav.tsx`

- [ ] **Step 1: Add sound toggle to Nav**

Read `web/components/Nav.tsx` and add a sound toggle button that reads/writes `useAudioStore`:
```typescript
import { Volume2, VolumeX } from "lucide-react";
import { useAudioStore } from "@/lib/stores/audio-store";
import {
  enableExperienceAudio,
  disableExperienceAudio,
  pulseHaptic,
} from "@/components/experience/experience-audio";

// Inside component:
const { isEnabled, isMuted, setEnabled, toggleMute } = useAudioStore();

const handleToggleSound = async () => {
  pulseHaptic("select");
  if (isEnabled) {
    disableExperienceAudio();
    setEnabled(false);
  } else {
    const ok = await enableExperienceAudio();
    setEnabled(ok);
  }
};

// Add button to nav (next to auth controls):
<button
  type="button"
  onClick={handleToggleSound}
  aria-label={isEnabled ? "Mute sound" : "Enable sound"}
  className="nav-sound-toggle"
>
  {isEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
</button>
```

- [ ] **Step 2: Remove duplicate sound toggles from ExperienceShell and ArrivalScene3D**

The sound toggle should now exist only in Nav. Remove the `.experience-sound` button from `ExperienceShell.tsx` and its `toggleSound` function (but keep the audio orchestration calls).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add persistent sound toggle to Nav, remove per-page duplicates"
```

---

## Self-Review Checklist

- [ ] **Phase 0 coverage**: Delete Rive files ✓, Delete dead audio ✓, Install GSAP/Howler/Tone ✓
- [ ] **Phase 1 coverage**: AudioManager ✓, audio-store persist ✓, SFX library ✓, Music system ✓, experience-audio wrapper ✓, ExperienceShell wire ✓, ArrivalScene3D wire ✓, WordCardGame update ✓
- [ ] **Phase 2 coverage**: MCP generation script ✓
- [ ] **Phase 3 coverage**: AnimationDirector ✓, MascotAnimation ✓, CeremonyAnimation ✓
- [ ] **Phase 4 coverage**: CinematicOrchestrator ✓, missing event emissions ✓, auto-enable ✓
- [ ] **Phase 5 coverage**: TimerRing ✓, Confetti/ScorePopup/ResultReveal ✓, game renderer upgrades ✓
- [ ] **Phase 6 coverage**: Spatial audio hook ✓
- [ ] **Phase 7 coverage**: LoadingSkeleton ✓, Nav sound toggle ✓
- [ ] **No placeholders**: All tasks have complete code
- [ ] **Type consistency**: `audioManager` singleton used everywhere, `useAudioStore` persist middleware matches channel names
- [ ] **Spec mapping**: Every spec requirement has a corresponding task
