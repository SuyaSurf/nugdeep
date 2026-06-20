"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AudioState {
  isEnabled: boolean;
  isMuted: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  ambientVolume: number;

  setEnabled: (enabled: boolean) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  setMasterVolume: (volume: number) => void;
  setChannelVolume: (channel: "sfx" | "music" | "ambient" | "voice", volume: number) => void;
  reset: () => void;
}

const initialState = {
  isEnabled: false,
  isMuted: false,
  masterVolume: 1.0,
  sfxVolume: 1.0,
  musicVolume: 1.0,
  ambientVolume: 1.0,
};

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      ...initialState,

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      setMuted: (muted) => set({ isMuted: muted }),

      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      setMasterVolume: (volume) =>
        set({ masterVolume: Math.max(0, Math.min(1, volume)) }),

      setChannelVolume: (channel, volume) => {
        const clamped = Math.max(0, Math.min(1, volume));
        const key = channel === "sfx" ? "sfxVolume"
          : channel === "music" ? "musicVolume"
          : channel === "ambient" ? "ambientVolume"
          : "masterVolume";
        set({ [key]: clamped } as any);
      },

      reset: () => set(initialState),
    }),
    {
      name: "bammby-audio",
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        isMuted: state.isMuted,
        masterVolume: state.masterVolume,
        sfxVolume: state.sfxVolume,
        musicVolume: state.musicVolume,
        ambientVolume: state.ambientVolume,
      }),
    },
  ),
);
