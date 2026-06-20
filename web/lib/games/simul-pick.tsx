"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { Eye } from "lucide-react";
import { playExperienceSelect, pulseHaptic } from "@/components/experience/experience-audio";
import { ResultReveal } from "@/components/juice/ResultReveal";
import { Confetti } from "@/components/juice/Confetti";
import type { GameEngine, GameState, GameResult } from "./game-engine";

const SYMBOLS = ["Rock", "Paper", "Scissors"];

interface SimulPickState extends GameState {
  pick: string | null;
}

const initial = (seed?: string): SimulPickState => ({
  round: { number: 1, prompt: "Pick a symbol. Your opponent picks too.", timeLimit: 8 },
  status: "playing",
  myInput: null,
  theirInput: null,
  timeRemaining: 8,
  pick: null,
});

function SimulPickRenderer({
  state: genericState,
  onInput,
  result,
}: {
  state: GameState;
  isMyTurn: boolean;
  onInput: (input: unknown) => void;
  result?: GameResult;
}) {
  const state = genericState as SimulPickState;
  const [pick, setPick] = useState<string | null>(null);

  const choose = useCallback((symbol: string) => {
    if (pick) return;
    setPick(symbol);
    playExperienceSelect();
    pulseHaptic("select");
    onInput({ pick: symbol });
  }, [pick, onInput]);

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
        <Eye />
      </div>
      {result ? (
        <ResultReveal
          winner={result.winner}
          myScore={result.myScore}
          theirScore={result.theirScore}
          summary={result.summary}
        />
      ) : (
        <>
          <p className="lobby-kicker">Pick simultaneously</p>
          <h1 className="text-6xl">{pick ?? "?"}</h1>
          <p>{pick ? "Waiting for reveal..." : "Rock beats Scissors, Scissors beats Paper, Paper beats Rock."}</p>
          {!pick && (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              {SYMBOLS.map((s) => (
                <button key={s} type="button" className="lobby-primary-action" onClick={() => choose(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const simulPick: GameEngine = {
  id: "simul_pick",
  name: "Simul-Pick",
  maxRounds: 7,
  roundTime: 8,

  createInitialState: (seed) => initial(seed),

  processInput: (state, input) => {
    const { pick } = input as { pick: string };
    return {
      ...state,
      status: "resolved",
      myInput: { pick },
      pick,
      timeRemaining: 0,
    };
  },

  resolve: (myState, theirState) => {
    const myPick = (myState as SimulPickState).pick ?? "Rock";
    const theirPick = (theirState as SimulPickState).pick ?? "Rock";
    const beats: Record<string, string> = { Rock: "Scissors", Paper: "Rock", Scissors: "Paper" };

    if (myPick === theirPick) return { winner: "draw", myScore: 0, theirScore: 0, summary: `Both picked ${myPick}. Draw.` };
    if (beats[myPick] === theirPick) return { winner: "me", myScore: 1, theirScore: 0, summary: `${myPick} beats ${theirPick}. You win.` };
    return { winner: "them", myScore: 0, theirScore: 1, summary: `${theirPick} beats ${myPick}. They win.` };
  },

  Renderer: SimulPickRenderer,
};
