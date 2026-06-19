"use client";

import {
  enableMixer,
  disableMixer,
  isMixerEnabled,
  playSfxSelect,
  playSfxEnter,
  playSfxReveal,
  pulseHaptic as mixerPulseHaptic,
} from "@/lib/experience/experience-mixer";

let audioContext: AudioContext | null = null;
let ambientGain: GainNode | null = null;
let ambientNodes: OscillatorNode[] = [];
let enabled = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

function tone(
  frequency: number,
  duration: number,
  volume: number,
  delay = 0,
  type: OscillatorType = "sine",
) {
  if (!enabled) return;
  const context = getContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startsAt = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(volume, startsAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startsAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration);
}

export async function enableExperienceAudio(): Promise<boolean> {
  const context = getContext();
  if (!context) return false;
  await context.resume();
  enabled = true;

  if (!ambientGain) {
    ambientGain = context.createGain();
    ambientGain.gain.setValueAtTime(0.0001, context.currentTime);
    ambientGain.gain.exponentialRampToValueAtTime(
      0.025,
      context.currentTime + 1.2,
    );
    ambientGain.connect(context.destination);

    ambientNodes = [42, 63, 84].map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.detune.setValueAtTime(index * 4 - 4, context.currentTime);
      oscillator.connect(ambientGain!);
      oscillator.start();
      return oscillator;
    });
  }

  localStorage.setItem("bammby-sound", "on");
  await enableMixer();
  tone(392, 0.45, 0.035);
  tone(587, 0.55, 0.025, 0.09);
  return true;
}

export function disableExperienceAudio() {
  enabled = false;
  localStorage.setItem("bammby-sound", "off");
  disableMixer();
  const context = audioContext;
  if (!context || !ambientGain) return;

  ambientGain.gain.cancelScheduledValues(context.currentTime);
  ambientGain.gain.exponentialRampToValueAtTime(
    0.0001,
    context.currentTime + 0.35,
  );
  window.setTimeout(() => {
    ambientNodes.forEach((node) => {
      try {
        node.stop();
      } catch {}
    });
    ambientNodes = [];
    ambientGain?.disconnect();
    ambientGain = null;
  }, 400);
}

export function isExperienceAudioEnabled() {
  return enabled;
}

export function playExperienceSelect() {
  playSfxSelect();
}

export function playExperienceEnter() {
  playSfxEnter();
}

export function playExperienceReveal() {
  playSfxReveal();
}

export function pulseHaptic(
  pattern: "select" | "enter" | "match" = "select",
) {
  mixerPulseHaptic(pattern);
}
