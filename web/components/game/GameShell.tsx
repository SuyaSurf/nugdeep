"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check } from "lucide-react";
import { useLobbyStore } from "@/lib/stores/lobby-store";
import { useWsStore } from "@/lib/stores/ws-store";
import type { GameEngine, GameState, GameResult } from "@/lib/games/game-engine";
import { playExperienceReveal, pulseHaptic } from "@/components/experience/experience-audio";
import { useExperienceEventStore } from "@/lib/experience/event-store";
import { CeremonyAnimation } from "@/components/experience/CeremonyAnimation";

interface GameShellProps {
  engine: GameEngine;
  onComplete: (result: GameResult) => void;
  matchId?: string;
  aiLevel?: number;
}

export function GameShell({ engine, onComplete, matchId, aiLevel }: GameShellProps) {
  const opponent = useLobbyStore((s) => s.match?.opponent ?? "Opponent");
  const [gameState, setGameState] = useState<GameState>(() =>
    engine.createInitialState()
  );
  const [result, setResult] = useState<GameResult | undefined>();
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<"playing" | "resolving" | "done">("playing");

  const emit = useExperienceEventStore((s) => s.emit);

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const opponentInputRef = useRef<unknown>(null);
  const ownInputRef = useRef<unknown>(null);
  const nonceRef = useRef(Math.random().toString(36).slice(2));
  const prevScoreRef = useRef<{ my: number; their: number }>({ my: 0, their: 0 });

  const isMultiplayer = Boolean(matchId && !matchId.startsWith("ai_") && !matchId.startsWith("preview_"));

  useEffect(() => {
    if (!isMultiplayer || !matchId) return;
    const myNonce = nonceRef.current;
    const { send, subscribe } = useWsStore.getState();
    send("lobby", { type: "room:join", room: `match:${matchId}` });
    const unsub = subscribe("lobby", (msg) => {
      const m = msg as Record<string, unknown>;
      if (m.type === "game:input") {
        const payload = m.payload as Record<string, unknown>;
        if (payload._nonce !== myNonce) {
          opponentInputRef.current = payload.input;
        }
      }
    });
    return unsub;
  }, [isMultiplayer, matchId]);

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
    const newState = engine.processInput(gameState, input);
    setGameState(newState);
    ownInputRef.current = input;
    setPhase("resolving");
    clearInterval(timerRef.current);

    if (isMultiplayer && matchId) {
      useWsStore.getState().send("lobby", {
        type: "game:input",
        room: `match:${matchId}`,
        payload: { input, _nonce: nonceRef.current },
      });
    }
  }, [engine, gameState, isMultiplayer, matchId]);

  useEffect(() => {
    if (phase !== "resolving") return;

    if (isMultiplayer && !opponentInputRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      const options = aiLevel ? { aiDifficulty: aiLevel } : undefined;
      const theirState = isMultiplayer
        ? engine.processInput(engine.createInitialState(), opponentInputRef.current)
        : engine.createInitialState(undefined, options);
      const finalResult = engine.resolve(gameState, theirState, options);
      setResult(finalResult);
      setPhase("done");
      opponentInputRef.current = null;
      ownInputRef.current = null;
      playExperienceReveal();
      pulseHaptic("match");

      const winner = finalResult.winner === "me" ? "win" : finalResult.winner === "them" ? "lose" : "draw";
      emit({
        type: "round_resolved",
        payload: {
          gameId: matchId ?? "",
          outcome: winner,
          myScore: finalResult.myScore,
          theirScore: finalResult.theirScore,
          intensity: aiLevel ? aiLevel / 4 : 0.5,
        },
      });

      if (finalResult.myScore !== prevScoreRef.current.my || finalResult.theirScore !== prevScoreRef.current.their) {
        emit({
          type: "score_changed",
          payload: {
            gameId: matchId ?? "",
            myScore: finalResult.myScore,
            theirScore: finalResult.theirScore,
          },
        });
        prevScoreRef.current = { my: finalResult.myScore, their: finalResult.theirScore };
      }
    }, isMultiplayer ? 200 : aiLevel ? 1200 - aiLevel * 200 : 800);
    return () => clearTimeout(timer);
  }, [phase, engine, gameState, isMultiplayer, aiLevel, matchId, emit]);

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
          <CeremonyAnimation
            type={round >= engine.maxRounds ? "game-over" : "score-reveal"}
            outcome={result.winner === "me" ? "win" : result.winner === "them" ? "lose" : undefined}
            visible
          />
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
            <span>You / {phase === "resolving" ? "sent" : "playing"}</span>
            <span>{opponent} / {phase === "resolving" && isMultiplayer ? "thinking" : "waiting"}</span>
          </div>
        </>
      )}
    </section>
  );
}
