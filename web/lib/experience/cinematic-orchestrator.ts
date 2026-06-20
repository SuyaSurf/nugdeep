// web/lib/experience/cinematic-orchestrator.ts
"use client";

import { useEffect, useRef } from "react";
import { useExperienceEventStore } from "./event-store";
import { useAudioStore } from "@/lib/stores/audio-store";
import { playSfx } from "@/lib/juice/sfx-library";
import { startMusicBed, stopMusicBed, setMusicIntensity } from "@/lib/juice/music-system";
import { pulseHaptic } from "@/components/experience/experience-audio";
import {
  confettiBurst,
  screenFlash,
} from "@/lib/juice/animation-director";

/**
 * Subscribes to experience-event-store and dispatches
 * synchronized audio + visual sequences.
 * Renders as a null component — attach to any layout.
 */
export function CinematicOrchestrator() {
  const lastEvent = useExperienceEventStore((s) => s.lastEvent);
  const isEnabled = useAudioStore((s) => s.isEnabled);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => { reducedMotionRef.current = e.matches; };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!lastEvent || !isEnabled) return;

    // Audio + haptics always play when sound is enabled
    switch (lastEvent.type) {
      case "queue_searching":
        startMusicBed("low");
        break;
      case "match_found":
        playSfx("match-found");
        pulseHaptic("match");
        setMusicIntensity("medium");
        break;
      case "game_start":
        playSfx("enter");
        pulseHaptic("enter");
        setMusicIntensity("high");
        break;
      case "round_resolved": {
        const outcome = lastEvent.payload.outcome;
        if (outcome === "win") {
          playSfx("game-over-win");
        } else if (outcome === "lose") {
          playSfx("game-over-lose");
        } else {
          playSfx("score-reveal");
        }
        pulseHaptic("select");
        break;
      }
      case "score_changed":
        playSfx("score-reveal");
        break;
      case "game_over":
        if (lastEvent.payload.outcome === "win") {
          playSfx("game-over-win");
        } else {
          playSfx("game-over-lose");
        }
        pulseHaptic("match");
        stopMusicBed();
        break;
      case "chat_unlocked":
        playSfx("chat-unlocked");
        pulseHaptic("enter");
        startMusicBed("low");
        break;
      case "message_received":
        playSfx("message-received");
        break;
      case "no_match":
        playSfx("back");
        stopMusicBed();
        break;
      case "ai_selected":
        playSfx("select");
        pulseHaptic("select");
        setMusicIntensity("medium");
        break;
    }

    // Visual effects only when reduced motion is not preferred
    if (reducedMotionRef.current) return;
    switch (lastEvent.type) {
      case "game_start":
        screenFlash("#8b5cf6");
        break;
      case "round_resolved": {
        const outcome = lastEvent.payload.outcome;
        if (outcome === "win") {
          confettiBurst({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
          screenFlash("#22c55e");
        } else if (outcome === "lose") {
          screenFlash("#ef4444");
        }
        break;
      }
      case "game_over":
        if (lastEvent.payload.outcome === "win") {
          confettiBurst({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        }
        break;
    }
  }, [lastEvent, isEnabled]);

  return null;
}
