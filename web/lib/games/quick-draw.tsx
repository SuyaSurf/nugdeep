"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { Swords, Timer } from "lucide-react";
import { playExperienceSelect, pulseHaptic } from "@/components/experience/experience-audio";
import { ResultReveal } from "@/components/juice/ResultReveal";
import { Confetti } from "@/components/juice/Confetti";
import type { GameEngine, GameState, GameResult } from "./game-engine";

interface QuickDrawState extends GameState {
  phase: "ready" | "draw" | "fired" | "flinched";
  fireTime: number | null;
  flinched: boolean;
}

const initial = (seed?: string): QuickDrawState => ({
  round: { number: 1, prompt: "Wait for DRAW! Then fire first.", timeLimit: 8 },
  status: "playing",
  myInput: null,
  theirInput: null,
  timeRemaining: 8,
  phase: "ready",
  fireTime: null,
  flinched: false,
});

function QuickDrawRenderer({
  state: genericState,
  onInput,
  result,
}: {
  state: GameState;
  isMyTurn: boolean;
  onInput: (input: unknown) => void;
  result?: GameResult;
}) {
  const state = genericState as QuickDrawState;
  const [countdown, setCountdown] = useState(3);
  const [phase, setPhase] = useState<"ready" | "draw" | "done">("ready");
  const [fired, setFired] = useState(false);
  const [fireTs, setFireTs] = useState(0);
  const startTime = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (state.status !== "playing") return;
    timeoutRef.current = setTimeout(() => setCountdown(2), 700);
    const t2 = setTimeout(() => setCountdown(1), 1400);
    const t3 = setTimeout(() => {
      setCountdown(0);
      setPhase("draw");
      startTime.current = performance.now();
    }, 2100);
    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [state.status]);

  const fire = useCallback(() => {
    if (fired) return;
    const elapsed = (performance.now() - startTime.current) / 1000;
    setFired(true);
    setFireTs(elapsed);
    setPhase("done");
    playExperienceSelect();
    pulseHaptic("select");

    if (phase === "ready") {
      onInput({ action: "flinch", fireTime: elapsed });
    } else {
      onInput({ action: "fire", fireTime: elapsed });
    }
  }, [fired, phase, onInput]);

  const flinched = phase === "ready" && fired;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      gsap.fromTo(el, { opacity: 0, y: 20, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out" });
    }
  }, []);

  return (
    <div className="game-chamber" ref={containerRef}>
      <Confetti active={!!result && result.winner === "me"} />
      <div className="game-chamber__artifact" aria-hidden="true">
        <span />
        <i />
        {result ? <Swords /> : phase === "ready" ? <Timer /> : <Swords />}
      </div>
      {result ? (
        <ResultReveal
          winner={result.winner}
          myScore={Math.round(result.myScore * 1000) / 1000}
          theirScore={Math.round(result.theirScore * 1000) / 1000}
          summary={result.summary}
        />
      ) : (
        <>
          <p className="lobby-kicker">{fired ? "You fired." : phase === "draw" ? "DRAW!" : "Wait for it..."}</p>
          <h1 className="text-7xl tabular-nums" style={{ color: phase === "draw" ? "#22c55e" : "#f5f2e9" }}>
            {fired ? `${fireTs.toFixed(3)}s` : phase === "draw" ? "⚡" : countdown > 0 ? countdown : "..."}
          </h1>
          <p>
            {flinched
              ? "You flinched! Wait for DRAW next time."
              : fired
                ? `You drew in ${fireTs.toFixed(3)}s.`
                : phase === "draw"
                  ? "Fire now!"
                  : "Steady..."}
          </p>
          {!fired && (
            <button
              type="button"
              className="lobby-primary-action"
              onClick={fire}
              style={phase === "draw" ? { background: "#22c55e", borderColor: "#22c55e", color: "#09090d", boxShadow: "0 0 38px rgba(34,197,94,0.3)" } : undefined}
            >
              <Swords size={18} />
              {phase === "ready" ? "Fire!" : "FIRE!"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export const quickDraw: GameEngine = {
  id: "quick_draw",
  name: "Quick Draw",
  maxRounds: 5,
  roundTime: 8,

  createInitialState: (seed) => initial(seed),

  processInput: (state, input) => {
    const { action, fireTime } = input as { action: string; fireTime: number };
    return {
      ...state,
      status: "resolved",
      myInput: { action, fireTime },
      fireTime,
      flinched: action === "flinch",
      phase: action === "flinch" ? "flinched" : "fired",
      timeRemaining: 0,
    };
  },

  resolve: (myState, theirState) => {
    const my = myState as QuickDrawState;
    const their = theirState as QuickDrawState;

    if (my.flinched && their.flinched) return { winner: "draw", myScore: 0, theirScore: 0, summary: "Both flinched. Draw." };
    if (my.flinched) return { winner: "them", myScore: 0, theirScore: their.fireTime ?? 0, summary: "You flinched! They draw first." };
    if (their.flinched) return { winner: "me", myScore: my.fireTime ?? 0, theirScore: 0, summary: "They flinched! You draw first." };

    const myTime = my.fireTime ?? 999;
    const theirTime = their.fireTime ?? 999;
    if (Math.abs(myTime - theirTime) < 0.001) return { winner: "draw", myScore: myTime, theirScore: theirTime, summary: `Both drew at ${myTime.toFixed(3)}s. Draw.` };
    if (myTime < theirTime) return { winner: "me", myScore: myTime, theirScore: theirTime, summary: `You drew at ${myTime.toFixed(3)}s. They fired at ${theirTime.toFixed(3)}s.` };
    return { winner: "them", myScore: myTime, theirScore: theirTime, summary: `They drew at ${theirTime.toFixed(3)}s. You fired at ${myTime.toFixed(3)}s.` };
  },

  Renderer: QuickDrawRenderer,
};
