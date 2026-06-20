"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { Heart } from "lucide-react";
import { playExperienceSelect, pulseHaptic } from "@/components/experience/experience-audio";
import { ResultReveal } from "@/components/juice/ResultReveal";
import { Confetti } from "@/components/juice/Confetti";
import type { GameEngine, GameState, GameResult } from "./game-engine";

const PROMPTS = [
  { a: "Beach", b: "Mountains" },
  { a: "Coffee", b: "Tea" },
  { a: "Morning", b: "Night" },
  { a: "Cats", b: "Dogs" },
  { a: "Books", b: "Movies" },
  { a: "Summer", b: "Winter" },
  { a: "City", b: "Countryside" },
];

interface WhichOneState extends GameState {
  pick: string | null;
}

const initial = (seed?: string): WhichOneState => ({
  round: { number: 1, prompt: "Pick one. Match your opponent for points.", timeLimit: 6 },
  status: "playing",
  myInput: null,
  theirInput: null,
  timeRemaining: 6,
  pick: null,
});

function WhichOneRenderer({
  state: genericState,
  onInput,
  result,
}: {
  state: GameState;
  isMyTurn: boolean;
  onInput: (input: unknown) => void;
  result?: GameResult;
}) {
  const state = genericState as WhichOneState;
  const [pick, setPick] = useState<string | null>(null);
  const prompt = PROMPTS[(state.round.number - 1) % PROMPTS.length];

  const choose = useCallback((choice: string) => {
    if (pick) return;
    setPick(choice);
    playExperienceSelect();
    pulseHaptic("select");
    onInput({ pick: choice });
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
        <Heart />
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
          <p className="lobby-kicker">Which one?</p>
          <h1 className="text-4xl">{prompt.a} or {prompt.b}?</h1>
          <p>{pick ? "Waiting for them..." : "Pick one."}</p>
          {!pick && (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
              <button type="button" className="lobby-primary-action" onClick={() => choose(prompt.a)}>
                {prompt.a}
              </button>
              <button type="button" className="lobby-primary-action" onClick={() => choose(prompt.b)}>
                {prompt.b}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const whichOne: GameEngine = {
  id: "which_one",
  name: "Which One",
  maxRounds: 7,
  roundTime: 6,

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
    const myPick = (myState as WhichOneState).pick;
    const theirPick = (theirState as WhichOneState).pick;
    if (myPick === theirPick) return { winner: "draw", myScore: 1, theirScore: 1, summary: `Both picked ${myPick}. Match!` };
    return { winner: "draw", myScore: 0, theirScore: 0, summary: `You: ${myPick}. Them: ${theirPick}. No match.` };
  },

  Renderer: WhichOneRenderer,
};
