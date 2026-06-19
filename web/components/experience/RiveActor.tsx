"use client";

import { useState, useEffect } from "react";
import { useRive } from "@rive-app/react-canvas";
import type { AICharacterMood } from "@/lib/ai-characters";
import type { RiveAssetDescriptor } from "@/lib/experience/rive-assets";

interface RiveActorProps {
  asset: RiveAssetDescriptor;
  mood?: AICharacterMood;
  className?: string;
  width?: number;
  height?: number;
}

const MOOD_TRIGGER_NAMES = ["idle", "selected", "thinking", "win", "lose", "mood"];

function CssMascotFallback({ mood, accent }: { mood?: AICharacterMood; accent?: string }) {
  const emoji = mood === "win" ? "🎉" : mood === "lose" ? "😔" : mood === "thinking" ? "🤔" : mood === "selected" ? "✅" : "👋";
  return (
    <div
      className="rive-fallback rive-fallback--mascot"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2rem",
        background: accent ?? "var(--agent-accent, #666)",
        borderRadius: "50%",
        opacity: 0.8,
      }}
      aria-hidden="true"
    >
      {emoji}
    </div>
  );
}

export function RiveActor({ asset, mood = "idle", className = "", width = 80, height = 80 }: RiveActorProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  const { RiveComponent, rive } = useRive({
    src: asset.src,
    artboard: asset.artboard,
    stateMachines: asset.stateMachine,
    autoplay: true,
    onLoadError: () => setLoadFailed(true),
  });

  useEffect(() => {
    if (!rive || loadFailed) return;
    try {
      const inputs = rive.stateMachineInputs(asset.stateMachine);
      const namesToTry = [mood, ...MOOD_TRIGGER_NAMES.filter((n) => n !== mood)];

      for (const input of inputs) {
        if (namesToTry.includes(input.name)) {
          if (input.type === 58) {
            input.fire();
          }
          break;
        }
      }

      for (const input of inputs) {
        if (input.name === "mood_select") {
          const numInput = input as { value: number };
          const moodIndex = ["idle", "selected", "thinking", "win", "lose"].indexOf(mood);
          if (moodIndex >= 0) {
            numInput.value = moodIndex;
          }
          break;
        }
      }
    } catch {}
  }, [mood, rive, loadFailed, asset.stateMachine]);

  if (loadFailed) {
    return <CssMascotFallback mood={mood} />;
  }

  return (
    <div className={`rive-actor ${className}`} style={{ width, height }} aria-hidden="true">
      <RiveComponent style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
