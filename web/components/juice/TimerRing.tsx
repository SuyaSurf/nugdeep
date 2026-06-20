// web/components/juice/TimerRing.tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { playSfx } from "@/lib/juice/sfx-library";
import { timerUrgent } from "@/lib/juice/animation-director";

interface TimerRingProps {
  seconds: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  urgentColor?: string;
}

export function TimerRing({
  seconds,
  total,
  size = 128,
  strokeWidth = 8,
  color = "#8b5cf6",
  urgentColor = "#ef4444",
}: TimerRingProps) {
  const ringRef = useRef<SVGCircleElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const prevSeconds = useRef(seconds);

  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const progress = seconds / total;
  const isUrgent = seconds <= 5;

  useEffect(() => {
    const prev = prevSeconds.current;
    if (seconds < prev && seconds > 0 && Math.floor(seconds) !== Math.floor(prev)) {
      playSfx(isUrgent ? "countdown-urgent" : "countdown-tick");
    }
    prevSeconds.current = seconds;

    if (ringRef.current) {
      const offset = circ * (1 - progress);
      gsap.to(ringRef.current, {
        strokeDashoffset: offset,
        duration: 0.3,
        ease: "power1.out",
        overwrite: true,
      });
    }

    if (isUrgent && textRef.current) {
      timerUrgent(textRef.current, seconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  return (
    <svg width={size} height={size} className="-rotate-90" aria-label={`${Math.ceil(seconds)} seconds remaining`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#374151"
        strokeWidth={strokeWidth}
      />
      <circle
        ref={ringRef}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={isUrgent ? urgentColor : color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circ}`}
        strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round"
      />
      <text
        ref={textRef}
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fill="white"
        className="text-2xl font-bold"
        style={{ transition: "fill 0.3s" }}
      >
        {Math.ceil(seconds)}
      </text>
    </svg>
  );
}
