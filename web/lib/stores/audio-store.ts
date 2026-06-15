"use client";

import { create } from "zustand";

export interface AudioState {
  isEnabled: boolean;
  isMuted: boolean;
  masterVolume: number;
  setEnabled: (enabled: boolean) => void;
  setMuted: (muted: boolean) => void;
  setMasterVolume: (volume: number) => void;
  toggleMute: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  isEnabled: false,
  isMuted: false,
  masterVolume: 1.0,
  setEnabled: (enabled) => set({ isEnabled: enabled }),
  setMuted: (muted) => set({ isMuted: muted }),
  setMasterVolume: (volume) => set({ masterVolume: volume }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}));
