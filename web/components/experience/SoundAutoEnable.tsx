"use client";

import { useEffect } from "react";
import { useAudioStore } from "@/lib/stores/audio-store";
import { enableExperienceAudio } from "./experience-audio";

export function SoundAutoEnable() {
  useEffect(() => {
    const { isEnabled } = useAudioStore.getState();
    if (isEnabled) {
      enableExperienceAudio().then((ok) => {
        if (!ok) useAudioStore.getState().setEnabled(false);
      }).catch(() => {});
      return;
    }
    const handler = () => {
      const { isEnabled: nowEnabled } = useAudioStore.getState();
      if (!nowEnabled) {
        enableExperienceAudio().then((ok) => {
          if (ok) useAudioStore.getState().setEnabled(true);
        }).catch(() => {});
      }
    };
    document.addEventListener("pointerdown", handler, { once: true });
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  return null;
}
