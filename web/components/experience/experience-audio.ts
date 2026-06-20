// web/components/experience/experience-audio.ts
"use client";

import { audioManager } from "@/lib/juice/audio-manager";
import { loadSfxLibrary, playSfx } from "@/lib/juice/sfx-library";
import { startMusicBed, stopMusicBed, setMusicIntensity } from "@/lib/juice/music-system";

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

  // Start procedural music bed
  startMusicBed("low").catch(() => {});

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
  const patterns: Record<string, number | number[]> = {
    select: 8,
    enter: [10, 30, 18],
    match: [18, 40, 22, 40, 32],
  };
  const vibration = patterns[pattern];
  navigator.vibrate(typeof vibration === "number" ? vibration : [...vibration]);
}
