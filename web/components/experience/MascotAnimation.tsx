// web/components/experience/MascotAnimation.tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { AICharacterMood } from "@/lib/ai-characters";

interface MascotAnimationProps {
  name: string;
  level: number;
  accent: string;
  mood?: AICharacterMood;
  size?: number;
}

export function MascotAnimation({
  name,
  level,
  accent,
  mood = "idle",
  size = 80,
}: MascotAnimationProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    gsap.killTweensOf(el);

    switch (mood) {
      case "idle":
        gsap.to(el, {
          y: -3,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        break;
      case "selected":
        gsap.fromTo(el,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }
        );
        gsap.to(el, {
          boxShadow: `0 0 20px ${accent}44`,
          duration: 0.3,
        });
        break;
      case "thinking":
        gsap.to(el, {
          rotation: 5,
          duration: 0.3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        break;
      case "win":
        gsap.fromTo(el,
          { scale: 1, y: 0 },
          { scale: 1.15, y: -8, duration: 0.3, ease: "back.out(2)", yoyo: true, repeat: 2 }
        );
        break;
      case "lose":
        gsap.to(el, {
          opacity: 0.5,
          scale: 0.9,
          duration: 0.4,
          ease: "power2.in",
        });
        break;
    }

    return () => { gsap.killTweensOf(el); };
  }, [mood, accent]);

  return (
    <div
      ref={cardRef}
      className="mascot-animation"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.22,
        opacity: 0.85,
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
      aria-label={`${name} (level ${level})`}
    >
      <span style={{ textAlign: "center", lineHeight: 1.2, padding: 4 }}>
        {name[0]}
        <br />
        <small style={{ fontSize: size * 0.12, opacity: 0.7 }}>Lv.{level}</small>
      </span>
    </div>
  );
}
