// web/components/juice/LoadingSkeleton.tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface LoadingSkeletonProps {
  lines?: number;
  width?: string;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, width = "100%", height = "1rem", className = "" }: LoadingSkeletonProps) {
  const shimmerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = shimmerRef.current;
    if (!el) return;
    gsap.to(el, {
      x: "100%",
      duration: 1.2,
      repeat: -1,
      ease: "power1.inOut",
    });
  }, []);

  return (
    <div className={`loading-skeleton ${className}`} aria-label="Loading" role="status">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            width: typeof width === "string" ? width : `${width}px`,
            height: typeof height === "string" ? height : `${height}px`,
            background: "#1e293b",
            borderRadius: "0.5rem",
            position: "relative",
            overflow: "hidden",
            marginBottom: "0.75rem",
          }}
        >
          <div
            ref={i === 0 ? shimmerRef : undefined}
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
              transform: "translateX(-100%)",
            }}
          />
        </div>
      ))}
    </div>
  );
}
