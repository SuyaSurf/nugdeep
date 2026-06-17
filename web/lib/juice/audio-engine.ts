"use client";

// Shared procedural audio engine.
// Every game gets: signature, tick, resolve (win/lose), ambient.
// Extends the existing AudioSystem.ts pattern to all 30 games.

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// ─── Primitives ─────────────────────────────────────────────

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, delay = 0) {
  try {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime + delay);
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime + delay + dur);
  } catch {}
}

function noise(dur: number, vol = 0.05, delay = 0) {
  try {
    const c = ctx();
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    src.connect(g);
    g.connect(c.destination);
    src.start(c.currentTime + delay);
  } catch {}
}

// ─── Sound palette ──────────────────────────────────────────

// Bell / chime — pleasant, bright
function bell(freq: number, dur = 0.3, vol = 0.1) {
  tone(freq, dur, "sine", vol);
  tone(freq * 1.5, dur * 0.6, "sine", vol * 0.3);
  tone(freq * 2, dur * 0.3, "sine", vol * 0.15);
}

// Buzz / error — harsh, short
function buzz(dur = 0.15, vol = 0.08) {
  tone(200, dur, "sawtooth", vol);
  tone(180, dur, "square", vol * 0.5);
}

// Click / tick — short percussive
function click(vol = 0.04) {
  noise(0.03, vol);
  tone(2000, 0.02, "square", vol * 0.5);
}

// Impact / thud — low, heavy
function thud(vol = 0.12) {
  tone(80, 0.2, "sine", vol);
  noise(0.1, vol * 0.3);
}

// Rising sweep — tension building
function sweep(from: number, to: number, dur: number, vol = 0.06) {
  try {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(from, c.currentTime);
    o.frequency.linearRampToValueAtTime(to, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch {}
}

// Ambient drone — low continuous hum
let droneNode: OscillatorNode | null = null;
let droneGain: GainNode | null = null;

function droneStart(freq = 55, vol = 0.02) {
  try {
    const c = ctx();
    droneNode = c.createOscillator();
    droneGain = c.createGain();
    droneNode.type = "sine";
    droneNode.frequency.setValueAtTime(freq, c.currentTime);
    droneGain.gain.setValueAtTime(vol, c.currentTime);
    droneNode.connect(droneGain);
    droneGain.connect(c.destination);
    droneNode.start();
  } catch {}
}

function droneStop() {
  try {
    if (droneGain) droneGain.gain.exponentialRampToValueAtTime(0.001, ctx().currentTime + 0.5);
    if (droneNode) setTimeout(() => { try { droneNode?.stop(); } catch {} }, 500);
    droneNode = null;
    droneGain = null;
  } catch {}
}

// Win fanfare — ascending arpeggio
function fanfare(vol = 0.1) {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, "sine", vol, i * 0.12));
  setTimeout(() => bell(1047, 0.6, vol * 0.8), 480);
}

// Lose — descending sigh
function sigh(vol = 0.08) {
  tone(400, 0.3, "sine", vol);
  tone(350, 0.3, "sine", vol * 0.6, 0.15);
  tone(300, 0.4, "sine", vol * 0.4, 0.3);
}

// ─── Category presets ───────────────────────────────────────

// Each game category has a distinct sonic signature.
// Call these when a game mounts / unmounts.

export const AudioPresets = {
  nerve: {
    start: () => { tone(200, 0.1, "square", 0.04); droneStart(55, 0.015); },
    tick: () => { tone(800, 0.03, "square", 0.03); },
    resolve: (win: boolean) => { win ? fanfare(0.08) : sigh(0.06); droneStop(); },
    ambient: { start: () => droneStart(55, 0.015), stop: () => droneStop() },
  },

  reflex: {
    start: () => { tone(1000, 0.05, "sine", 0.06); },
    tick: () => click(0.03),
    resolve: (win: boolean) => {
      if (win) { bell(880, 0.2, 0.08); setTimeout(() => bell(1100, 0.3, 0.06), 100); }
      else buzz(0.2, 0.06);
    },
    ambient: { start: () => {}, stop: () => {} },
  },

  psychology: {
    start: () => { bell(440, 0.5, 0.06); },
    tick: () => tone(600, 0.05, "sine", 0.02),
    resolve: (win: boolean) => {
      if (win) { tone(660, 0.5, "sine", 0.08); setTimeout(() => bell(880, 0.4, 0.06), 200); }
      else tone(330, 0.4, "sine", 0.06);
    },
    ambient: { start: () => droneStart(65, 0.01), stop: () => droneStop() },
  },

  social: {
    start: () => { bell(660, 0.4, 0.06); },
    tick: () => tone(1200, 0.03, "sine", 0.02),
    resolve: (win: boolean) => {
      if (win) bell(880, 0.5, 0.08);
      else tone(500, 0.3, "sine", 0.04);
    },
    ambient: { start: () => droneStart(52, 0.01), stop: () => droneStop() },
  },

  strategy: {
    start: () => { thud(0.06); },
    tick: () => { click(0.02); },
    resolve: (win: boolean) => {
      if (win) { thud(0.1); setTimeout(() => bell(660, 0.3, 0.06), 200); }
      else { tone(100, 0.3, "sine", 0.08); }
    },
    ambient: { start: () => droneStart(48, 0.02), stop: () => droneStop() },
  },

  knowledge: {
    start: () => { bell(523, 0.3, 0.06); },
    tick: () => { click(0.03); },
    resolve: (win: boolean) => {
      if (win) { tone(880, 0.15, "sine", 0.08); setTimeout(() => bell(1047, 0.3, 0.06), 80); }
      else buzz(0.15, 0.05);
    },
    ambient: { start: () => {}, stop: () => {} },
  },

  visual: {
    start: () => { tone(500, 0.08, "sine", 0.05); },
    tick: () => click(0.02),
    resolve: (win: boolean) => {
      if (win) tone(700, 0.2, "sine", 0.08);
      else tone(400, 0.2, "sine", 0.05);
    },
    ambient: { start: () => {}, stop: () => {} },
  },
} as const;

export type GameCategory = keyof typeof AudioPresets;

// ─── Game audio profile hook ────────────────────────────────

import { useEffect, useRef } from "react";

export function useGameAudio(category: GameCategory) {
  const preset = AudioPresets[category];
  const started = useRef(false);

  useEffect(() => {
    if (!started.current && preset.ambient.start) {
      preset.ambient.start();
      started.current = true;
    }
    return () => {
      if (preset.ambient.stop) preset.ambient.stop();
      started.current = false;
    };
  }, [category]);

  return {
    start: preset.start,
    tick: preset.tick,
    resolve: preset.resolve,
  };
}

// Mute toggle
let _muted = false;
export function isMuted() { return _muted; }
export function setMuted(m: boolean) { _muted = m; }
