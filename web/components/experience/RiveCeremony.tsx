"use client";

import { useState, useCallback } from "react";
import { useRive } from "@rive-app/react-canvas";
import type { RiveAssetDescriptor } from "@/lib/experience/rive-assets";

interface RiveCeremonyProps {
  asset: RiveAssetDescriptor;
  visible?: boolean;
  onComplete?: () => void;
  className?: string;
}

function CssCeremonyFallback({ label, visible }: { label: string; visible?: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="rive-fallback rive-fallback--ceremony"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "linear-gradient(135deg, rgba(255,147,104,0.15), rgba(142,157,255,0.15))",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.1)",
        animation: visible ? "fadeIn 0.3s ease-out" : "none",
      }}
      aria-hidden="true"
    >
      <span style={{ fontSize: "1.5rem", fontWeight: 600, opacity: 0.7 }}>{label}</span>
    </div>
  );
}

export function RiveCeremony({ asset, visible = true, onComplete, className = "" }: RiveCeremonyProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  const { RiveComponent } = useRive({
    src: asset.src,
    artboard: asset.artboard,
    stateMachines: asset.stateMachine,
    autoplay: true,
    onLoadError: () => setLoadFailed(true),
    onStop: () => onComplete?.(),
  });

  if (loadFailed) {
    const label = asset.role === "ceremony-match-found" ? "Match Found!"
      : asset.role === "ceremony-game-over" ? "Game Over"
      : asset.role === "ceremony-score-reveal" ? "Score"
      : asset.role === "ceremony-chat-unlocked" ? "Chat Unlocked"
      : "";
    onComplete?.();
    return <CssCeremonyFallback label={label} visible={visible} />;
  }

  if (!visible) return null;

  return (
    <div className={`rive-ceremony ${className}`} aria-hidden="true">
      <RiveComponent style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
