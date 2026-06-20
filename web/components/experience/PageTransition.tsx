// web/components/experience/PageTransition.tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: 10, scale: 0.995 },
      { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power2.out", delay: 0.05 }
    );
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
