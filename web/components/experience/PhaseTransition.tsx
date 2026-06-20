// web/components/experience/PhaseTransition.tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

interface PhaseTransitionProps {
  children: ReactNode;
  phase: string;
  className?: string;
}

export function PhaseTransition({ children, phase, className = "" }: PhaseTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPhase = useRef(phase);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (phase !== prevPhase.current) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) {
        prevPhase.current = phase;
        return;
      }

      gsap.fromTo(
        el,
        { opacity: 0, y: 16, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "power2.out" }
      );
      prevPhase.current = phase;
    }
  }, [phase]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
