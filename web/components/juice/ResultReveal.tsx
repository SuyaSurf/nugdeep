// web/components/juice/ResultReveal.tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface ResultRevealProps {
  winner: "me" | "them" | "draw";
  myScore: number;
  theirScore: number;
  summary: string;
  onComplete?: () => void;
}

const WINNER_LABELS = {
  me: "You took it.",
  them: "They took it.",
  draw: "Draw.",
};

export function ResultReveal({ winner, myScore, theirScore, summary, onComplete }: ResultRevealProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const score = scoreRef.current;
    if (!card) return;

    const tl = gsap.timeline({ onComplete });
    tl.fromTo(card, { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.7)" });
    if (score) {
      const decimals = Math.max(
        (String(myScore).split(".")[1] ?? "").length,
        (String(theirScore).split(".")[1] ?? "").length,
      );
      const obj = { val: 0 };
      tl.to(obj, {
        val: myScore,
        duration: 0.6,
        ease: "power2.out",
        onUpdate: () => {
          const formatted = decimals > 0 ? obj.val.toFixed(decimals) : String(Math.round(obj.val));
          score.textContent = `${formatted}:${theirScore}`;
        },
      }, "-=0.2");
    }
  }, [myScore, theirScore, onComplete]);

  return (
    <div
      ref={cardRef}
      className="result-reveal"
      style={{
        padding: "2rem",
        borderRadius: "1rem",
        background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))",
        border: "1px solid rgba(255,255,255,0.1)",
        textAlign: "center",
      }}
    >
      <p className="lobby-kicker" style={{ marginBottom: 8 }}>{WINNER_LABELS[winner]}</p>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 8 }}>{summary}</h1>
      <div
        ref={scoreRef}
        style={{ fontSize: "2rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
      >
        {myScore}:{theirScore}
      </div>
    </div>
  );
}
