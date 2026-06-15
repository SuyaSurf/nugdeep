"use client";

import { useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { playExperienceSelect, pulseHaptic } from "@/components/experience/experience-audio";
import type { GameEngine, GameState, GameResult } from "./game-engine";

interface FoodRemedyState extends GameState {
  question: string;
  options: string[];
  correct: number;
  pick: number | null;
}

const QUESTIONS = [
  { q: "Low blood pressure", options: ["Beetroot juice", "Green tea", "Apple cider vinegar", "Lemon water"], correct: 0 },
  { q: "Sore throat", options: ["Honey + ginger tea", "Orange juice", "Iced coffee", "Dark chocolate"], correct: 0 },
  { q: "Insomnia", options: ["Warm chamomile tea", "Espresso", "Energy drink", "Cold water"], correct: 0 },
  { q: "Nausea", options: ["Ginger tea", "Mint tea", "Black coffee", "Tomato juice"], correct: 0 },
  { q: "Headache", options: ["Peppermint oil", "Hot sauce", "Lemon juice", "Vinegar"], correct: 0 },
  { q: "Bloating", options: ["Peppermint tea", "Sparkling water", "Milk", "Orange juice"], correct: 0 },
  { q: "Low energy", options: ["Green smoothie", "Energy drink", "Black coffee", "Sugary cereal"], correct: 0 },
  { q: "Sunburn", options: ["Aloe vera", "Lemon juice", "Toothpaste", "Vinegar"], correct: 0 },
  { q: "Brain fog", options: ["Blueberries", "White bread", "Sugary soda", "Fried food"], correct: 0 },
  { q: "Muscle soreness", options: ["Tart cherry juice", "Milk", "Soda", "Orange juice"], correct: 0 },
  { q: "Constipation", options: ["Prunes", "Cheese", "White rice", "Bananas"], correct: 0 },
  { q: "Anxiety", options: ["Ashwagandha tea", "Espresso", "Energy drink", "Cold brew"], correct: 0 },
  { q: "Cough", options: ["Thyme tea with honey", "Iced latte", "Milk", "Soda"], correct: 0 },
  { q: "Menstrual cramps", options: ["Ginger compress", "Ice cream", "Cold milk", "Lemonade"], correct: 0 },
];

const initial = (seed?: string): FoodRemedyState => {
  const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  return {
    round: { number: 1, prompt: "Pick the best natural remedy.", timeLimit: 8 },
    status: "playing",
    myInput: null,
    theirInput: null,
    timeRemaining: 8,
    question: q.q,
    options: q.options,
    correct: q.correct,
    pick: null,
  };
};

function FoodRemedyRenderer({
  state: genericState,
  onInput,
  result,
}: {
  state: GameState;
  isMyTurn: boolean;
  onInput: (input: unknown) => void;
  result?: GameResult;
}) {
  const state = genericState as FoodRemedyState;
  const [pick, setPick] = useState<number | null>(null);

  const choose = useCallback((idx: number) => {
    if (pick !== null) return;
    setPick(idx);
    playExperienceSelect();
    pulseHaptic("select");
    onInput({ pick: idx });
  }, [pick, onInput]);

  const correct = state.correct;

  return (
    <div className="game-chamber">
      <div className="game-chamber__artifact" aria-hidden="true">
        <span />
        <i />
        <Heart />
      </div>
      {result ? (
        <>
          <p className="lobby-kicker">{result.winner === "me" ? "You knew it." : result.winner === "them" ? "They knew it." : "Same result."}</p>
          <h1>{result.summary}</h1>
        </>
      ) : (
        <>
          <p className="lobby-kicker">Natural remedy for...</p>
          <h1 className="text-4xl">{state.question}</h1>
          <p>{pick !== null ? "Waiting for them..." : "Pick the best option."}</p>
          {pick === null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              {state.options.map((opt, i) => (
                <button key={i} type="button" className="lobby-primary-action" onClick={() => choose(i)}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          {pick !== null && (
            <p style={{ marginTop: 16, color: pick === correct ? "#22c55e" : "#ef4444" }}>
              {pick === correct ? "Correct!" : `Wrong. The answer was: ${state.options[correct]}`}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export const foodRemedy: GameEngine = {
  id: "food_remedy",
  name: "Food Remedy",
  maxRounds: 7,
  roundTime: 8,

  createInitialState: (seed) => initial(seed),
  processInput: (state, input) => {
    const { pick } = input as { pick: number };
    return { ...state, status: "resolved", myInput: { pick }, pick, timeRemaining: 0 };
  },

  resolve: (myState, theirState) => {
    const myCorrect = (myState as FoodRemedyState).pick === (myState as FoodRemedyState).correct;
    const theirCorrect = (theirState as FoodRemedyState).pick === (theirState as FoodRemedyState).correct;
    if (myCorrect && theirCorrect) return { winner: "draw", myScore: 1, theirScore: 1, summary: "Both got it right." };
    if (myCorrect) return { winner: "me", myScore: 1, theirScore: 0, summary: "You got it right. They didn't." };
    if (theirCorrect) return { winner: "them", myScore: 0, theirScore: 1, summary: "They got it right. You didn't." };
    return { winner: "draw", myScore: 0, theirScore: 0, summary: "Both wrong." };
  },

  Renderer: FoodRemedyRenderer,
};
