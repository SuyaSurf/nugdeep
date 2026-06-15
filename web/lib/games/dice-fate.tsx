"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sprout, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from "lucide-react";
import { playExperienceSelect, pulseHaptic } from "@/components/experience/experience-audio";
import type { GameEngine, GameState, GameResult } from "./game-engine";

interface DiceFateState extends GameState {
  bet: "high" | "low" | null;
  roll: number | null;
}

const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

const initial = (seed?: string): DiceFateState => ({
  round: { number: 1, prompt: "Bet high (4-6) or low (1-3). The die decides.", timeLimit: 8 },
  status: "playing",
  myInput: null,
  theirInput: null,
  timeRemaining: 8,
  bet: null,
  roll: null,
});

function DiceFateRenderer({
  state: genericState,
  onInput,
  result,
}: {
  state: GameState;
  isMyTurn: boolean;
  onInput: (input: unknown) => void;
  result?: GameResult;
}) {
  const state = genericState as DiceFateState;
  const [bet, setBet] = useState<"high" | "low" | null>(null);
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const placeBet = useCallback((choice: "high" | "low") => {
    if (bet) return;
    setBet(choice);
    playExperienceSelect();
    pulseHaptic("select");
    onInput({ bet: choice });
  }, [bet, onInput]);

  useEffect(() => {
    if (!result || rolling) return;
    setRolling(true);
    let i = 0;
    timerRef.current = setTimeout(() => {
      const interval = setInterval(() => {
        setFace(Math.floor(Math.random() * 6) + 1);
        i++;
        if (i > 8) {
          clearInterval(interval);
          setRolling(false);
        }
      }, 80);
    }, 200);
    return () => clearTimeout(timerRef.current);
  }, [result, rolling]);

  const dieFace = result ? Math.round(result.myScore) : face;
  const DiceIcon = diceIcons[Math.min(dieFace - 1, 5)];

  return (
    <div className="game-chamber">
      <div className="game-chamber__artifact" aria-hidden="true">
        <span />
        <i />
        <DiceIcon />
      </div>
      {result ? (
        <>
          <p className="lobby-kicker">{rolling ? "The die is tumbling..." : "The die settled."}</p>
          <h1 className="text-7xl tabular-nums">{rolling ? "..." : dieFace}</h1>
          <p>{result.summary}</p>
          <div className="game-chamber__players">
            <span>You / {result.myScore > 0 ? "Win" : "Lose"}</span>
            <span>They / {result.theirScore > 0 ? "Win" : "Lose"}</span>
          </div>
        </>
      ) : (
        <>
          <p className="lobby-kicker">Bet on the die</p>
          <h1 className="text-7xl tabular-nums">{bet ? (bet === "high" ? "4-6" : "1-3") : "?"}</h1>
          <p>Will the die land high (4-6) or low (1-3)?</p>
          {!bet && (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
              <button type="button" className="lobby-primary-action" onClick={() => placeBet("low")} style={{ background: "#6366f1", borderColor: "#6366f1" }}>
                <Sprout size={18} />
                Low (1-3)
              </button>
              <button type="button" className="lobby-primary-action" onClick={() => placeBet("high")} style={{ background: "#ef4444", borderColor: "#ef4444" }}>
                <Sprout size={18} />
                High (4-6)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const diceFate: GameEngine = {
  id: "dice_fate",
  name: "Dice Fate",
  maxRounds: 7,
  roundTime: 8,

  createInitialState: (seed) => initial(seed),

  processInput: (state, input) => {
    const { bet } = input as { bet: "high" | "low" };
    return {
      ...state,
      status: "resolved",
      myInput: { bet },
      bet,
      timeRemaining: 0,
    };
  },

  resolve: (myState, theirState) => {
    const myBet = (myState as DiceFateState).bet;
    const theirBet = (theirState as DiceFateState).bet;
    const roll = Math.floor(Math.random() * 6) + 1;
    const high = roll >= 4;
    const myWin = (myBet === "high" && high) || (myBet === "low" && !high);
    const theirWin = (theirBet === "high" && high) || (theirBet === "low" && !high);

    if (myWin && theirWin) return { winner: "draw", myScore: roll, theirScore: roll, summary: `Both guessed correctly. Die: ${roll}. Draw.` };
    if (myWin) return { winner: "me", myScore: roll, theirScore: roll, summary: `Die: ${roll}. You bet ${myBet} and won!` };
    if (theirWin) return { winner: "them", myScore: roll, theirScore: roll, summary: `Die: ${roll}. They bet ${theirBet} and won.` };
    return { winner: "draw", myScore: roll, theirScore: roll, summary: `Die: ${roll}. Both wrong. Draw.` };
  },

  Renderer: DiceFateRenderer,
};
