"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check } from "lucide-react";
import { useLobbyStore } from "@/lib/stores/lobby-store";
import type { GameEngine, GameState, GameResult } from "@/lib/games/game-engine";
import { playExperienceReveal, pulseHaptic } from "@/components/experience/experience-audio";

interface GameShellProps {
  engine: GameEngine;
  onComplete: (result: GameResult) => void;
}

export function GameShell({ engine, onComplete }: GameShellProps) {
  const opponent = useLobbyStore((s) => s.match?.opponent ?? "Opponent");
  const [gameState, setGameState] = useState<GameState>(() =>
    engine.createInitialState()
  );
  const [result, setResult] = useState<GameResult | undefined>();
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<"playing" | "resolving" | "done">("playing");

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        const next = { ...prev, timeRemaining: prev.timeRemaining - 1 };
        if (next.timeRemaining <= 0) {
          setPhase("resolving");
          return { ...next, status: "resolved" as const, timeRemaining: 0 };
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const handleInput = useCallback((input: unknown) => {
    setGameState((prev) => engine.processInput(prev, input));
    setPhase("resolving");
    clearInterval(timerRef.current);
  }, [engine]);

  useEffect(() => {
    if (phase !== "resolving") return;
    const timer = setTimeout(() => {
      const theirState = engine.createInitialState();
      const finalResult = engine.resolve(gameState, theirState);
      setResult(finalResult);
      setPhase("done");
      playExperienceReveal();
      pulseHaptic("match");
    }, 800);
    return () => clearTimeout(timer);
  }, [phase, engine, gameState]);

  const nextRound = useCallback(() => {
    if (round < engine.maxRounds) {
      setRound((r) => r + 1);
      setGameState(engine.createInitialState());
      setResult(undefined);
      setPhase("playing");
    } else {
      onComplete(result!);
    }
  }, [round, engine, result, onComplete]);

  return (
    <section className="game-chamber">
      {phase === "done" && result ? (
        <>
          <div className="game-chamber__artifact" aria-hidden="true">
            <span />
            <i />
            <Check />
          </div>
          <p className="lobby-kicker">Round {round} of {engine.maxRounds}</p>
          <h1>{result.winner === "me" ? "You took it." : result.winner === "them" ? "They took it." : "Draw."}</h1>
          <p>{result.summary}</p>
          <div className="game-chamber__players">
            <span>You / {result.myScore}</span>
            <span>{opponent} / {result.theirScore}</span>
          </div>
          <button type="button" className="lobby-primary-action" onClick={nextRound}>
            {round < engine.maxRounds ? "Next round" : "See results"}
            <Check size={18} />
          </button>
        </>
      ) : (
        <>
          <engine.Renderer
            state={gameState}
            isMyTurn={true}
            onInput={handleInput}
          />
          <div className="game-chamber__players">
            <span>You / waiting</span>
            <span>{opponent} / waiting</span>
          </div>
        </>
      )}
    </section>
  );
}
