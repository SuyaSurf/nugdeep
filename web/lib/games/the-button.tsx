"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CircleStop, Timer } from "lucide-react";
import { playExperienceSelect, pulseHaptic } from "@/components/experience/experience-audio";
import type { GameEngine, GameState, GameResult } from "./game-engine";

interface TheButtonState extends GameState {
  startTime: number | null;
  stopTime: number | null;
  elapsed: number;
}

const initial = (seed?: string): TheButtonState => ({
  round: { number: 1, prompt: "Press stop as close to 10s as possible without going over.", timeLimit: 12 },
  status: "playing",
  myInput: null,
  theirInput: null,
  timeRemaining: 12,
  startTime: null,
  stopTime: null,
  elapsed: 0,
});

function TheButtonRenderer({
  state: genericState,
  onInput,
  result,
}: {
  state: GameState;
  isMyTurn: boolean;
  onInput: (input: unknown) => void;
  result?: GameResult;
}) {
  const state = genericState as TheButtonState;
  const [elapsed, setElapsed] = useState(0);
  const [stopped, setStopped] = useState(false);
  const raf = useRef<number>(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    if (state.status !== "playing" || stopped) return;
    startTime.current = performance.now();
    const tick = () => {
      setElapsed((performance.now() - startTime.current) / 1000);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [state.status, stopped]);

  const stop = useCallback(() => {
    if (stopped) return;
    const e = (performance.now() - startTime.current) / 1000;
    setStopped(true);
    cancelAnimationFrame(raf.current);
    playExperienceSelect();
    pulseHaptic("select");
    onInput({ elapsed: e });
  }, [stopped, onInput]);

  const diff = Math.abs(10 - elapsed);
  const busted = elapsed > 10;

  return (
    <div className="game-chamber">
      <div className="game-chamber__artifact" aria-hidden="true">
        <span />
        <i />
        {stopped ? <Timer /> : <CircleStop />}
      </div>
      {result ? (
        <>
          <p className="lobby-kicker">{result.winner === "me" ? "You took it." : result.winner === "them" ? "They took it." : "Draw."}</p>
          <h1>{result.summary}</h1>
          <div className="game-chamber__players">
            <span>You / {result.myScore.toFixed(2)}s</span>
            <span>They / {result.theirScore.toFixed(2)}s</span>
          </div>
        </>
      ) : (
        <>
          <p className="lobby-kicker">Press stop as close to 10s</p>
          <h1 className="text-6xl tabular-nums">{elapsed.toFixed(2)}s</h1>
          <p>
            {busted
              ? "You went over. That's a bust."
              : stopped
                ? `${diff.toFixed(2)}s away from 10s`
                : "Press stop before 10s hits."}
          </p>
          {!stopped && (
            <button type="button" className="lobby-primary-action" onClick={stop}>
              <CircleStop size={18} />
              Stop
            </button>
          )}
        </>
      )}
    </div>
  );
}

export const theButton: GameEngine = {
  id: "the_button",
  name: "The Button",
  maxRounds: 1,
  roundTime: 12,

  createInitialState: (seed) => initial(seed),

  processInput: (state, input) => {
    const { elapsed } = input as { elapsed: number };
    return {
      ...state,
      status: "resolved",
      myInput: { elapsed },
      elapsed,
      timeRemaining: 0,
    };
  },

  resolve: (myState, theirState) => {
    const myElapsed = (myState as TheButtonState).elapsed;
    const theirElapsed = (theirState as TheButtonState).elapsed;
    const myBust = myElapsed > 10;
    const theirBust = theirElapsed > 10;

    if (myBust && theirBust) return { winner: "draw", myScore: myElapsed, theirScore: theirElapsed, summary: "Both went over 10s. Draw." };
    if (myBust) return { winner: "them", myScore: myElapsed, theirScore: theirElapsed, summary: `You went over at ${myElapsed.toFixed(2)}s. They win.` };
    if (theirBust) return { winner: "me", myScore: myElapsed, theirScore: theirElapsed, summary: `They went over at ${theirElapsed.toFixed(2)}s. You win.` };

    const myDiff = Math.abs(10 - myElapsed);
    const theirDiff = Math.abs(10 - theirElapsed);
    if (Math.abs(myDiff - theirDiff) < 0.01) return { winner: "draw", myScore: myElapsed, theirScore: theirElapsed, summary: `Double ${myElapsed.toFixed(2)}s — draw.` };
    if (myDiff < theirDiff) return { winner: "me", myScore: myElapsed, theirScore: theirElapsed, summary: `${myElapsed.toFixed(2)}s beats ${theirElapsed.toFixed(2)}s. You win.` };
    return { winner: "them", myScore: myElapsed, theirScore: theirElapsed, summary: `${theirElapsed.toFixed(2)}s beats ${myElapsed.toFixed(2)}s. They win.` };
  },

  Renderer: TheButtonRenderer,
};
