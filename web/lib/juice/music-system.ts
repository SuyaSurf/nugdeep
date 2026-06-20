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
