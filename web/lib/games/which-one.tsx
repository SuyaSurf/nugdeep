"use client";

import { useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { playExperienceSelect, pulseHaptic } from "@/components/experience/experience-audio";
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

  return (
    <div className="game-chamber">
      <div className="game-chamber__artifact" aria-hidden="true">
        <span />
        <i />
        <Heart />
      </div>
      {result ? (
        <>
          <p className="lobby-kicker">{result.winner === "draw" ? "Matched!" : "Different picks."}</p>
          <h1>{result.summary}</h1>
          <div className="game-chamber__players">
            <span>You / {pick}</span>
            <span>They / {result.myScore === 1 ? "matched" : "different"}</span>
          </div>
        </>
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
