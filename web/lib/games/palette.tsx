"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Palette } from "lucide-react";
import { playExperienceSelect, pulseHaptic } from "@/components/experience/experience-audio";
import type { GameEngine, GameState, GameResult } from "./game-engine";

interface PaletteState extends GameState {
  targetColor: string;
  targetPosition: number;
  guessedPosition: number | null;
}

function randomColor(): string {
  const hues = [0, 30, 60, 120, 180, 240, 270, 300, 330];
  const h = hues[Math.floor(Math.random() * hues.length)];
  return `hsl(${h}, 70%, 50%)`;
}

const initial = (seed?: string): PaletteState => ({
  round: { number: 1, prompt: "Memorize the color. Tap where it was on the gradient.", timeLimit: 10 },
  status: "playing",
  myInput: null,
  theirInput: null,
  timeRemaining: 10,
  targetColor: "",
  targetPosition: 0,
  guessedPosition: null,
});

function PaletteRenderer({
  state: genericState,
  onInput,
  result,
}: {
  state: GameState;
  isMyTurn: boolean;
  onInput: (input: unknown) => void;
  result?: GameResult;
}) {
  const state = genericState as PaletteState;
  const [phase, setPhase] = useState<"memorize" | "guess" | "done">("memorize");
  const [guess, setGuess] = useState<number | null>(null);
  const [showColor, setShowColor] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);

  const color = state.targetColor || "#888";
  const gradient = "linear-gradient(to right, hsl(0,70%,50%), hsl(60,70%,50%), hsl(120,70%,50%), hsl(180,70%,50%), hsl(240,70%,50%), hsl(300,70%,50%), hsl(360,70%,50%))";

  useEffect(() => {
    const t1 = setTimeout(() => setShowColor(false), 2000);
    const t2 = setTimeout(() => setPhase("guess"), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== "guess" || guess !== null) return;
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pct = (x - rect.left) / rect.width;
    const clamped = Math.round(Math.max(0, Math.min(100, pct * 100)));
    setGuess(clamped);
    setPhase("done");
    playExperienceSelect();
    pulseHaptic("select");
    onInput({ position: clamped });
  }, [phase, guess, onInput]);

  const diff = guess !== null ? Math.abs(guess - state.targetPosition) : 0;

  return (
    <div className="game-chamber">
      <div className="game-chamber__artifact" aria-hidden="true">
        <span />
        <i />
        <Palette />
      </div>
      {result ? (
        <>
          <p className="lobby-kicker">{result.winner === "me" ? "Closer." : result.winner === "them" ? "They were closer." : "Same distance."}</p>
          <h1>{result.summary}</h1>
          <div className="game-chamber__players">
            <span>You / off by {result.myScore.toFixed(0)}%</span>
            <span>They / off by {result.theirScore.toFixed(0)}%</span>
          </div>
        </>
      ) : (
        <>
          <p className="lobby-kicker">{phase === "memorize" ? "Memorize this color" : guess !== null ? `You tapped at ${guess}%` : "Tap the color on the gradient"}</p>
          {phase === "memorize" && showColor && (
            <div style={{ width: "100%", height: 80, background: color, borderRadius: 8, margin: "12px 0" }} />
          )}
          {phase !== "memorize" && (
            <div
              ref={barRef}
              onClick={handleTap}
              onTouchStart={handleTap}
              style={{ width: "100%", height: 48, background: gradient, borderRadius: 8, margin: "12px 0", cursor: "crosshair", position: "relative", touchAction: "none" }}
            >
              {guess !== null && (
                <div style={{ position: "absolute", left: `${guess}%`, top: -8, width: 4, height: 64, background: "#fff", borderRadius: 2, transform: "translateX(-50%)" }} />
              )}
            </div>
          )}
          <p>
            {phase === "memorize"
              ? "Look closely..."
              : guess !== null
                ? `You were ${diff.toFixed(0)}% away from the target.`
                : "Tap where you think the color was."}
          </p>
        </>
      )}
    </div>
  );
}

export const palette: GameEngine = {
  id: "palette",
  name: "Palette",
  maxRounds: 5,
  roundTime: 10,

  createInitialState: (seed) => {
    const pos = Math.floor(Math.random() * 91) + 5;
    return {
      ...initial(seed),
      targetColor: `hsl(${Math.round(pos * 3.6)}, 70%, 50%)`,
      targetPosition: pos,
    };
  },

  processInput: (state, input) => {
    const { position } = input as { position: number };
    return {
      ...state,
      status: "resolved",
      myInput: { position },
      guessedPosition: position,
      timeRemaining: 0,
    };
  },

  resolve: (myState, theirState) => {
    const myDiff = Math.abs((myState as PaletteState).guessedPosition ?? 100 - (myState as PaletteState).targetPosition);
    const theirDiff = Math.abs((theirState as PaletteState).guessedPosition ?? 100 - (theirState as PaletteState).targetPosition);
    if (Math.abs(myDiff - theirDiff) < 1) return { winner: "draw", myScore: myDiff, theirScore: theirDiff, summary: `Both off by ${myDiff.toFixed(0)}%. Draw.` };
    if (myDiff < theirDiff) return { winner: "me", myScore: myDiff, theirScore: theirDiff, summary: `You were ${myDiff.toFixed(0)}% off. They were ${theirDiff.toFixed(0)}% off.` };
    return { winner: "them", myScore: myDiff, theirScore: theirDiff, summary: `They were ${theirDiff.toFixed(0)}% off. You were ${myDiff.toFixed(0)}% off.` };
  },

  Renderer: PaletteRenderer,
};
