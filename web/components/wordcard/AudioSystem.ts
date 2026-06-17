"use client";

import { useEffect, useRef } from "react";

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch { }
}

function playNoise(duration: number, volume = 0.05) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch { }
}

export function useCardAudio() {
  const playRef = useRef<() => void>(() => {});
  const scoreRef = useRef<(pts: number) => void>(() => {});
  const tickRef = useRef<() => void>(() => {});
  const winRef = useRef<() => void>(() => {});

  useEffect(() => {
    playCardAudio.current = () => {
      playNoise(0.15, 0.04);
      playTone(600, 0.1, "sine", 0.06);
    };
    scoreAudio.current = (pts: number) => {
      const base = 400 + pts * 80;
      playTone(base, 0.25, "sine", 0.12);
      setTimeout(() => playTone(base * 1.25, 0.2, "sine", 0.08), 80);
      if (pts >= 3) {
        setTimeout(() => playTone(base * 1.5, 0.3, "sine", 0.06), 160);
      }
    };
    tickAudio.current = () => {
      playTone(800, 0.05, "square", 0.04);
    };
    winAudio.current = () => {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.4, "sine", 0.12), i * 120);
      });
    };
    shuffleAudio.current = () => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          playNoise(0.08, 0.02);
          playTone(300 + Math.random() * 200, 0.06, "sine", 0.03);
        }, i * 60);
      }
    };
  }, []);

  return { play: playRef, score: scoreRef, tick: tickRef, win: winRef };
}

export const playCardAudio = { current: () => {} };
export const scoreAudio = { current: (_pts: number) => {} };
export const tickAudio = { current: () => {} };
export const winAudio = { current: () => {} };
export const shuffleAudio = { current: () => {} };
