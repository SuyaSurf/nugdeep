"use client";

import { Howl } from "howler";
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

  switch (name) {
    case "hover": case "select": click(); break;
    case "enter": t(110, 0.5); t(330, 0.6, "triangle", 0.08); break;
    case "back": t(300, 0.2); break;
    case "error": t(200, 0.15, "sawtooth"); t(180, 0.15, "square"); break;
    case "match-found":
      t(523, 0.2); setTimeout(() => t(659, 0.2), 100);
      setTimeout(() => t(784, 0.3), 200);
      break;
    case "game-over-win":
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => t(f, 0.4), i * 120));
      break;
    case "game-over-lose": t(400, 0.3); t(350, 0.3, "sine", 0.15); t(300, 0.4, "sine", 0.3); break;
    case "chat-unlocked": t(660, 0.08); setTimeout(() => t(880, 0.08), 80); break;
    case "score-reveal": t(294, 0.5); t(440, 0.5, "sine", 0.1); break;
    case "countdown-tick": t(800, 0.05, "square"); break;
    case "countdown-urgent": t(1000, 0.05, "square"); break;
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
