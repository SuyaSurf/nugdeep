// web/components/juice/ScorePopup.tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface ScorePopupProps {
  score: number;
  x: number;
  y: number;
  color?: string;
}

export function ScorePopup({ score, x, y, color = "#22c55e" }: ScorePopupProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    gsap.fromTo(el,
      { y: 0, opacity: 1, scale: 0.5 },
      { y: -60, opacity: 0, scale: 1.3, duration: 0.8, ease: "power2.out" }
    );
  }, []);

  return (
    <div
      ref={elRef}
      style={{
        position: "fixed",
        left: x,
        top: y,
        color,
        fontWeight: 700,
        fontSize: "1.5rem",
        pointerEvents: "none",
        zIndex: 9999,
        textShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      +{score}
    </div>
  );
}
