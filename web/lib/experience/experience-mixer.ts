"use client";

let mixerCtx: AudioContext | null = null;

export type MixerChannel = "sfx" | "music" | "ambient";

interface ChannelState {
  gain: GainNode;
  volume: number;
}

const channels = new Map<MixerChannel, ChannelState>();

let mixerEnabled = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!mixerCtx) {
    mixerCtx = new AC();
    for (const name of ["sfx", "music", "ambient"] as MixerChannel[]) {
      const gain = mixerCtx.createGain();
      gain.gain.setValueAtTime(1, mixerCtx.currentTime);
      gain.connect(mixerCtx.destination);
      channels.set(name, { gain, volume: 1 });
    }
  }
  return mixerCtx;
}

function tone(freq: number, dur: number, type?: OscillatorType, vol?: number, delay?: number, channel?: MixerChannel): void;
function tone(freq: number, dur: number, vol: number, delay?: number, channel?: MixerChannel): void;
function tone(freq: number, dur: number, typeOrVol?: OscillatorType | number, volOrDelay?: number, delayOrChannel?: number | MixerChannel, maybeChannel?: MixerChannel) {
  const type = typeof typeOrVol === "string" ? typeOrVol : "sine";
  const vol = typeof typeOrVol === "number" ? typeOrVol : (volOrDelay ?? 0.15);
  const delay = typeof typeOrVol === "string" ? (volOrDelay ?? 0) : (typeof typeOrVol === "number" ? (volOrDelay ?? 0) : 0);
  const channel: MixerChannel = typeof delayOrChannel === "string" ? delayOrChannel : (maybeChannel ?? "sfx");
  if (!mixerEnabled) return;
  const c = getCtx();
  if (!c) return;
  const ch = channels.get(channel);
  if (!ch) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime + delay);
    g.gain.setValueAtTime(vol * ch.volume, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    o.connect(g);
    g.connect(ch.gain);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime + delay + dur);
  } catch {}
}

function noise(dur: number, vol = 0.05, delay = 0, channel: MixerChannel = "sfx") {
  if (!mixerEnabled) return;
  const c = getCtx();
  if (!c) return;
  const ch = channels.get(channel);
  if (!ch) return;
  try {
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(vol * ch.volume, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    src.connect(g);
    g.connect(ch.gain);
    src.start(c.currentTime + delay);
  } catch {}
}

function bell(freq: number, dur = 0.3, vol = 0.1) {
  tone(freq, dur, "sine", vol);
  tone(freq * 1.5, dur * 0.6, "sine", vol * 0.3);
  tone(freq * 2, dur * 0.3, "sine", vol * 0.15);
}

function buzz(dur = 0.15, vol = 0.08) {
  tone(200, dur, "sawtooth", vol);
  tone(180, dur, "square", vol * 0.5);
}

function click(vol = 0.04) {
  noise(0.03, vol);
  tone(2000, 0.02, "square", vol * 0.5);
}

function thud(vol = 0.12) {
  tone(80, 0.2, "sine", vol);
  noise(0.1, vol * 0.3);
}

function fanfare(vol = 0.1) {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, "sine", vol, i * 0.12));
  setTimeout(() => bell(1047, 0.6, vol * 0.8), 480);
}

function sigh(vol = 0.08) {
  tone(400, 0.3, "sine", vol);
  tone(350, 0.3, "sine", vol * 0.6, 0.15);
  tone(300, 0.4, "sine", vol * 0.4, 0.3);
}

export async function enableMixer(): Promise<boolean> {
  const c = getCtx();
  if (!c) return false;
  await c.resume();
  mixerEnabled = true;
  return true;
}

export function disableMixer() {
  mixerEnabled = false;
}

export function isMixerEnabled(): boolean {
  return mixerEnabled;
}

export function setChannelVolume(channel: MixerChannel, volume: number) {
  const ch = channels.get(channel);
  if (!ch) return;
  ch.volume = Math.max(0, Math.min(1, volume));
  const c = mixerCtx;
  if (c) {
    ch.gain.gain.setValueAtTime(ch.volume, c.currentTime);
  }
}

export function getChannelVolume(channel: MixerChannel): number {
  return channels.get(channel)?.volume ?? 1;
}

let musicNodes: { node: OscillatorNode; gain: GainNode }[] = [];

export function startMusicBed(intensity: "low" | "medium" | "high" = "low") {
  if (!mixerEnabled) return;
  stopMusicBed();
  const c = getCtx();
  if (!c) return;
  const ch = channels.get("music");
  if (!ch) return;

  const freqs = intensity === "high" ? [110, 165, 220] : intensity === "medium" ? [82.5, 110, 165] : [55, 82.5, 110];
  const vols = intensity === "high" ? [0.015, 0.01, 0.008] : intensity === "medium" ? [0.012, 0.008, 0.006] : [0.01, 0.006, 0.004];

  musicNodes = freqs.map((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(vols[i] * ch.volume, c.currentTime + 1);
    o.connect(g);
    g.connect(ch.gain);
    o.start();
    return { node: o, gain: g };
  });
}

export function stopMusicBed() {
  const c = mixerCtx;
  if (c) {
    musicNodes.forEach(({ node, gain }) => {
      gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
      setTimeout(() => { try { node.stop(); } catch {} }, 600);
    });
  }
  musicNodes = [];
}

export function setMusicIntensity(intensity: "low" | "medium" | "high") {
  stopMusicBed();
  startMusicBed(intensity);
}

export function playSfxSelect() {
  tone(240, 0.08, "triangle", 0.035);
  tone(480, 0.12, 0.02, 0.035);
}

export function playSfxEnter() {
  tone(110, 0.5, "sine", 0.05);
  tone(330, 0.6, "triangle", 0.035, 0.08);
  tone(660, 0.8, 0.025, 0.17);
}

export function playSfxReveal() {
  tone(294, 0.5, 0.035);
  tone(440, 0.5, 0.03, 0.1);
  tone(740, 0.8, 0.025, 0.22);
}

export function playSfxMatchFound() {
  tone(523, 0.2, "sine", 0.06);
  setTimeout(() => tone(659, 0.2, "sine", 0.06), 100);
  setTimeout(() => tone(784, 0.3, "sine", 0.06), 200);
  setTimeout(() => bell(1047, 0.5, 0.08), 300);
}

export function playSfxGameOver(win: boolean) {
  if (win) fanfare(0.1);
  else sigh(0.08);
}

export function playSfxScoreCount() {
  click(0.03);
}

export function playSfxChatUnlocked() {
  tone(660, 0.08, "sine", 0.04);
  setTimeout(() => tone(880, 0.08, "sine", 0.04), 80);
  setTimeout(() => bell(1100, 0.4, 0.06), 160);
}

export function playSfxMessageReceived() {
  tone(1200, 0.04, "sine", 0.02);
}

export function playSfxNoMatch() {
  tone(300, 0.3, "sine", 0.04);
  tone(250, 0.3, "sine", 0.03, 0.15);
}

export function playSfxAiSelected() {
  tone(400, 0.1, "triangle", 0.04);
  setTimeout(() => tone(600, 0.15, "triangle", 0.03), 80);
}

export function pulseHaptic(pattern: "select" | "enter" | "match" = "select") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const patterns = {
    select: 8,
    enter: [10, 30, 18],
    match: [18, 40, 22, 40, 32],
  } as const;
  const vibration = patterns[pattern];
  navigator.vibrate(typeof vibration === "number" ? vibration : [...vibration]);
}
