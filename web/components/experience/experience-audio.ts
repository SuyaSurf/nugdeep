"use client";

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
  tone(392, 0.45, 0.035);
  tone(587, 0.55, 0.025, 0.09);
  return true;
}

export function disableExperienceAudio() {
  enabled = false;
  localStorage.setItem("bammby-sound", "off");
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
  tone(240, 0.08, 0.035, 0, "triangle");
  tone(480, 0.12, 0.02, 0.035);
}

export function playExperienceEnter() {
  tone(110, 0.5, 0.05, 0, "sine");
  tone(330, 0.6, 0.035, 0.08, "triangle");
  tone(660, 0.8, 0.025, 0.17);
}

export function playExperienceReveal() {
  tone(294, 0.5, 0.035);
  tone(440, 0.5, 0.03, 0.1);
  tone(740, 0.8, 0.025, 0.22);
}

export function pulseHaptic(
  pattern: "select" | "enter" | "match" = "select",
) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const patterns = {
    select: 8,
    enter: [10, 30, 18],
    match: [18, 40, 22, 40, 32],
  } as const;
  const vibration = patterns[pattern];
  navigator.vibrate(
    typeof vibration === "number" ? vibration : [...vibration],
  );
}
