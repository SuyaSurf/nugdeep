// web/components/experience/CeremonyAnimation.tsx
"use client";

import { useEffect, useRef } from "react";
import {
  matchFoundSequence,
  gameOverSequence,
  chatUnlockedSequence,
  confettiBurst,
} from "@/lib/juice/animation-director";

type CeremonyType = "match-found" | "game-over" | "score-reveal" | "chat-unlocked";

interface CeremonyAnimationProps {
  type: CeremonyType;
  outcome?: "win" | "lose";
  visible?: boolean;
  onComplete?: () => void;
  className?: string;
}

const LABELS: Record<CeremonyType, string> = {
  "match-found": "Match Found!",
  "game-over": "Game Over",
  "score-reveal": "Score",
  "chat-unlocked": "Chat Unlocked",
};

export function CeremonyAnimation({
  type,
  outcome = "win",
  visible = true,
  onComplete,
  className = "",
}: CeremonyAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !visible) return;

    // Reset completed flag when type changes so re-animations work
    completedRef.current = false;

    switch (type) {
      case "match-found":
        matchFoundSequence(el);
        setTimeout(() => {
          confettiBurst(
            { x: window.innerWidth / 2, y: window.innerHeight / 2 },
            el.parentElement ?? undefined,
          );
          onComplete?.();
        }, 600);
        break;
      case "game-over":
        gameOverSequence(el, outcome);
        setTimeout(() => onComplete?.(), 800);
        break;
      case "chat-unlocked":
        chatUnlockedSequence(el);
        setTimeout(() => onComplete?.(), 500);
        break;
      case "score-reveal":
        setTimeout(() => onComplete?.(), 400);
        break;
    }
  }, [type, outcome, visible, onComplete]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className={`ceremony-animation ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.1)",
        background: outcome === "win"
          ? "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(139,92,246,0.12))"
          : "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(255,147,104,0.12))",
      }}
      aria-hidden="true"
    >
      <span style={{ fontSize: "1.5rem", fontWeight: 600, opacity: 0.85 }}>
        {LABELS[type]}
        {type === "game-over" && outcome === "win" ? " — You Win!" : ""}
        {type === "game-over" && outcome === "lose" ? " — You Lose" : ""}
      </span>
    </div>
  );
}
