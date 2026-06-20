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

  /**
   * Lazily create AudioContext with compressor, analyser, and 4-channel bus.
   * Called by enable() — not on module import.
   */
  private getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) {
      this.ctx = new AC();

      // DynamicsCompressorNode for richer, fuller sound
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // AnalyserNode for audio-reactive visuals
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.connect(this.compressor);

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
      this.masterGain.connect(this.analyser);

      // 4 channel buses: sfx, music, ambient, voice
      for (const name of ["sfx", "music", "ambient", "voice"] as BusName[]) {
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1, this.ctx.currentTime);
        gain.connect(this.masterGain);
        this.buses.set(name, { gain, volume: 1 });
      }

      // Page Visibility API — pause when tab hidden
      this.visibilityHandler = () => {
        if (!this.ctx) return;
        if (document.hidden) {
          this.masterGain?.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        } else {
          this.masterGain?.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.5);
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }
    return this.ctx;
  }

  /**
   * Enable audio — resumes AudioContext (must be called from user gesture).
   */
  async enable(): Promise<boolean> {
    const c = this.getCtx();
    if (!c) return false;
    if (c.state === "suspended") await c.resume();
    this._enabled = true;
    return true;
  }

  /**
   * Disable audio — mute all channels.
   */
  disable() {
    this._enabled = false;
    this.buses.forEach((bus) => {
      if (!this.ctx) return;
      bus.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      bus.gain.gain.setValueAtTime(0, this.ctx.currentTime);
    });
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
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
    return this.masterGain?.gain.value ?? 1;
  }

  /**
   * Create a PannerNode for spatial audio.
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

  /**
   * Clean up all audio resources.
   */
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

// Singleton export
export const audioManager = new AudioManager();
