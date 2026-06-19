"use client";

import { useEffect } from "react";
import { useExperienceEventStore } from "@/lib/experience/event-store";
import {
  playSfxReveal,
  playSfxMatchFound,
  playSfxGameOver,
  playSfxScoreCount,
  playSfxChatUnlocked,
  playSfxMessageReceived,
  playSfxNoMatch,
  playSfxAiSelected,
  startMusicBed,
  stopMusicBed,
  setMusicIntensity,
  pulseHaptic,
} from "@/lib/experience/experience-mixer";

interface ExperienceEventDirectorProps {
  reducedMotion?: boolean;
  soundEnabled?: boolean;
}

export function ExperienceEventDirector({
  reducedMotion = false,
  soundEnabled = true,
}: ExperienceEventDirectorProps) {
  const lastEvent = useExperienceEventStore((s) => s.lastEvent);

  useEffect(() => {
    if (!lastEvent || !soundEnabled) return;
    if (reducedMotion) return;

    switch (lastEvent.type) {
      case "queue_searching":
        startMusicBed("low");
        break;
      case "match_found":
        playSfxMatchFound();
        pulseHaptic("match");
        setMusicIntensity("medium");
        break;
      case "game_start":
        playSfxReveal();
        pulseHaptic("enter");
        setMusicIntensity("high");
        break;
      case "round_resolved":
        playSfxGameOver(lastEvent.payload.outcome === "win");
        pulseHaptic("select");
        break;
      case "score_changed":
        playSfxScoreCount();
        break;
      case "game_over":
        playSfxGameOver(lastEvent.payload.outcome === "win");
        pulseHaptic("match");
        stopMusicBed();
        break;
      case "chat_unlocked":
        playSfxChatUnlocked();
        pulseHaptic("enter");
        startMusicBed("low");
        break;
      case "message_received":
        playSfxMessageReceived();
        break;
      case "no_match":
        playSfxNoMatch();
        stopMusicBed();
        break;
      case "ai_selected":
        playSfxAiSelected();
        pulseHaptic("select");
        setMusicIntensity("medium");
        break;
    }
  }, [lastEvent, soundEnabled, reducedMotion]);

  return null;
}
