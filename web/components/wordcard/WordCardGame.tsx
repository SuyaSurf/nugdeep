"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, wsConnectRooms } from "@/lib/api";
import Scene3D from "./Scene3D";
import { playCardAudio, scoreAudio, tickAudio, winAudio, shuffleAudio } from "./AudioSystem";

interface CardInfo {
  id: string;
  word: string;
}

interface GameState {
  id: string;
  center_card: CardInfo | null;
  current_turn: string;
  round: number;
  rounds_to_win: number;
  max_cards: number;
  status: string;
  winner_id: string | null;
  time_left: number;
  my_score: number;
  opponent_score: number;
  my_cards_played: number;
  opponent_cards_played: number;
  my_hand: CardInfo[];
  opponent_hand_count: number;
  my_turn: boolean;
  deck_count: number;
  can_refill: boolean;
  my_streak: number;
  opponent_streak: number;
  my_rounds_won: number;
  opponent_rounds_won: number;
  last_play_word: string;
}

type Phase = "idle" | "waiting" | "playing" | "round_end" | "finished";

export default function WordCardGame() {
  const { getToken, userId } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [pointsPopup, setPointsPopup] = useState<{ pts: number; exact: boolean; streak: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState(30);
  const [showBurst, setShowBurst] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  gameStateRef.current = gameState;

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === "playing" && gameState?.time_left != null && !gameState.my_turn) {
      setTimer(Math.ceil(gameState.time_left));
    }
  }, [phase, gameState?.time_left, gameState?.my_turn]);

  useEffect(() => {
    if (phase !== "playing" || !gameState || !gameState.my_turn) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        if (prev <= 6 && prev > 1) {
          tickAudio.current();
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, gameState?.id, gameState?.my_turn]);

  function showPoints(pts: number, exact: boolean, streak: boolean) {
    setPointsPopup({ pts, exact, streak });
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    popupTimerRef.current = setTimeout(() => setPointsPopup(null), 2000);
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 600);
    scoreAudio.current(pts);
    if (streak) {
      setTimeout(() => scoreAudio.current(pts), 150);
    }
  }

  async function connectWS(gid: string) {
    const token = await getToken();
    const ws = wsConnectRooms(token, [`wordcard:${gid}`]);
    wsRef.current = ws;
    ws.onmessage = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case "wordcard:game_started":
            setPhase("playing");
            setGameState(msg.state);
            setMessage("Game started!");
            shuffleAudio.current();
            break;
          case "wordcard:card_played":
            setGameState(msg.state);
            if (msg.points) {
              showPoints(msg.points, msg.exact_match, msg.streak_bonus);
            }
            if (msg.round_over) {
              setPhase("round_end");
              setTimeout(() => {
                if (msg.game_over) {
                  setPhase("finished");
                  winAudio.current();
                  setMessage(msg.winner_id === userId ? "You won the match!" : "Opponent won the match!");
                } else {
                  startNextRound(gid);
                }
              }, 2000);
            } else {
              playCardAudio.current();
            }
            break;
          case "wordcard:timeout":
            setPhase("finished");
            winAudio.current();
            setMessage(msg.winner === userId ? "Opponent timed out! You win!" : "You timed out!");
            break;
          case "wordcard:refilled":
            setGameState(msg.state);
            break;
          case "wordcard:new_round":
            setGameState(msg.state);
            setPhase("playing");
            setTimer(30);
            setMessage(`Round ${msg.round}`);
            shuffleAudio.current();
            setTimeout(() => setMessage(""), 2000);
            break;
        }
      } catch { }
    };
  }

  function updateGameState(newState: GameState) {
    setGameState(newState);
    setTimer(newState.my_turn ? 30 : Math.ceil(newState.time_left));
  }

  async function startNextRound(gid: string) {
    try {
      const token = await getToken();
      const data = await apiFetch(`/api/v1/wordcard/${gid}/next-round`, { token, method: "POST" });
      updateGameState(data.state);
      setPhase("playing");
      setTimer(30);
      setMessage(`Round ${data.round}`);
      shuffleAudio.current();
      setTimeout(() => setMessage(""), 2000);
    } catch {
      setMessage("Failed to start next round");
    }
  }

  async function createGame() {
    try {
      setMessage("");
      const token = await getToken();
      const data = await apiFetch("/api/v1/wordcard/create", { token, method: "POST" });
      setGameId(data.game_id);
      setPhase("waiting");
      setGameState(data.state);
      setMessage(`Game created! Share ID: ${data.game_id}`);
      connectWS(data.game_id);
    } catch (e: any) {
      setMessage(e.message || "Failed to create game");
    }
  }

  async function joinGame() {
    const gid = prompt("Enter game ID:");
    if (!gid) return;
    try {
      setMessage("");
      const token = await getToken();
      const data = await apiFetch(`/api/v1/wordcard/${gid}/join`, { token, method: "POST" });
      setGameId(gid);
      setPhase("playing");
      updateGameState(data.state);
      connectWS(gid);
    } catch (e: any) {
      setMessage(e.message || "Failed to join game");
    }
  }

  async function playCard(cardId: string) {
    if (!gameId || !gameState || !gameState.my_turn) return;
    setSelectedCard(cardId);
    try {
      const token = await getToken();
      const data = await apiFetch(`/api/v1/wordcard/${gameId}/play`, {
        token,
        method: "POST",
        body: JSON.stringify({ card_id: cardId }),
      });
      if (data.result === "invalid") {
        setMessage(data.message || "Invalid play");
        setSelectedCard(null);
        return;
      }
      if (data.points) {
        showPoints(data.points, data.exact_match, data.streak_bonus);
      }
      if (data.round_over) {
        setPhase("round_end");
        setTimeout(() => {
          if (data.game_over) {
            setPhase("finished");
            winAudio.current();
            setMessage("You won the match!");
          } else {
            startNextRound(gameId);
          }
        }, 2000);
      } else {
        playCardAudio.current();
      }
      updateGameState(data.state);
      setSelectedCard(null);
    } catch (e: any) {
      setMessage(e.message || "Failed to play");
      setSelectedCard(null);
    }
  }

  async function refillCard() {
    if (!gameId || !gameState || !gameState.can_refill) return;
    try {
      const token = await getToken();
      const data = await apiFetch(`/api/v1/wordcard/${gameId}/refill`, {
        token,
        method: "POST",
      });
      if (data.result === "refilled") {
        updateGameState(data.state);
        setMessage("Refilled 1 card");
        setTimeout(() => setMessage(""), 1500);
      } else {
        setMessage(data.message || "Cannot refill");
      }
    } catch (e: any) {
      setMessage(e.message || "Refill failed");
    }
  }

  const timerPercent = gameState?.my_turn ? (timer / 30) * 100 : 100;
  const timerColor =
    timer <= 5 ? "text-red-400 stroke-red-400" :
    timer <= 10 ? "text-amber-400 stroke-amber-400" :
    "text-rose-400 stroke-rose-400";

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {phase !== "idle" && (
        <div className="absolute inset-0 z-0">
          {gameState && (
            <Scene3D
              myHand={gameState.my_hand || []}
              opponentCount={gameState.opponent_hand_count || 0}
              centerCard={gameState.center_card}
              isMyTurn={gameState.my_turn}
              onPlayCard={playCard}
              selectedCardId={selectedCard}
              gameStatus={gameState.status}
              showBurst={showBurst}
            />
          )}
        </div>
      )}

      {phase === "idle" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="text-center space-y-6 max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-600/30 mb-2">
              <span className="text-3xl">🃏</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-100 tracking-tight">Word Card</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Match words by rhyme or shared letters.<br />
              Play fast for bonus points. Best of 3 rounds.
            </p>
            <div className="flex flex-col gap-3 items-center">
              <button
                onClick={createGame}
                className="w-56 px-6 py-3 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-500 hover:scale-105 transition-all shadow-lg shadow-rose-900/30"
              >
                Create Game
              </button>
              <button
                onClick={joinGame}
                className="w-56 px-6 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold hover:bg-slate-700 hover:scale-105 transition-all border border-slate-700"
              >
                Join Game
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "waiting" && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <div className="px-5 py-3 rounded-xl bg-slate-900/90 border border-slate-700/50 backdrop-blur-sm text-center shadow-xl">
            <div className="flex items-center gap-2 justify-center mb-1">
              <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <p className="text-slate-300 text-sm">Waiting for opponent...</p>
            </div>
            <p className="text-slate-500 text-xs font-mono">Game ID: {gameId}</p>
          </div>
        </div>
      )}

      {phase === "playing" && gameState && (
        <>
          <div className="absolute top-4 left-4 z-10">
            <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/50 backdrop-blur-sm shadow-lg">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">You</p>
              <p className="text-2xl font-bold text-slate-100">{gameState.my_score}</p>
              {gameState.my_streak >= 2 && (
                <p className="text-[10px] text-amber-400 font-semibold">
                  🔥 {gameState.my_streak}x streak
                </p>
              )}
            </div>
          </div>

          <div className="absolute top-4 right-4 z-10">
            <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/50 backdrop-blur-sm shadow-lg text-right">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Opponent</p>
              <p className="text-2xl font-bold text-slate-100">{gameState.opponent_score}</p>
              {gameState.opponent_streak >= 2 && (
                <p className="text-[10px] text-amber-400 font-semibold">
                  🔥 {gameState.opponent_streak}x streak
                </p>
              )}
            </div>
          </div>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {[1, 2, 3].map((r) => (
                <span
                  key={r}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    gameState.my_rounds_won >= r
                      ? "bg-rose-600/30 border-rose-500 text-rose-300"
                      : gameState.opponent_rounds_won >= (r === 1 ? 2 : r === 2 ? 1 : 0)
                      ? "bg-red-600/30 border-red-500 text-red-300"
                      : "bg-slate-800 border-slate-600 text-slate-500"
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700/50 backdrop-blur-sm shadow-lg text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                {gameState.my_turn ? "Your Turn" : "Opponent's Turn"}
              </p>
              <div className="relative inline-flex items-center justify-center mt-1">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-slate-700" strokeWidth="2" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    className={timerColor}
                    strokeWidth="2"
                    strokeDasharray={`${(timerPercent / 100) * 97.4} 97.4`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`absolute text-sm font-bold font-mono ${timerColor}`}>
                  {timer}
                </span>
              </div>
            </div>
          </div>

          {pointsPopup && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-bounce">
              <div className="text-center">
                <span
                  className={`text-3xl font-black drop-shadow-lg ${
                    pointsPopup.exact
                      ? "text-rose-400"
                      : pointsPopup.pts >= 3
                      ? "text-amber-400"
                      : "text-slate-300"
                  }`}
                >
                  +{pointsPopup.pts}
                </span>
                {pointsPopup.exact && (
                  <div className="text-xs font-bold text-rose-400 tracking-widest -mt-1">
                    EXACT MATCH
                  </div>
                )}
                {pointsPopup.streak && (
                  <div className="text-xs font-bold text-amber-400 tracking-widest -mt-1">
                    STREAK BONUS
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <div className="flex gap-3 items-center">
              <button
                onClick={refillCard}
                disabled={!gameState.can_refill}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg ${
                  gameState.can_refill
                    ? "bg-slate-800/90 text-slate-200 border border-slate-600/50 hover:bg-slate-700 hover:scale-105 backdrop-blur-sm"
                    : "bg-slate-800/40 text-slate-600 border border-slate-700/30 cursor-not-allowed backdrop-blur-sm"
                }`}
              >
                Refill ({gameState.deck_count})
              </button>
            </div>
          </div>
        </>
      )}

      {phase === "round_end" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="text-center space-y-3 animate-in fade-in zoom-in">
            <h2 className="text-2xl font-bold text-slate-100">Round Over</h2>
            <p className="text-slate-400">Starting next round...</p>
          </div>
        </div>
      )}

      {phase === "finished" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="text-center space-y-5 max-w-sm">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
              (message.includes("won") || message.includes("You win"))
                ? "bg-rose-600/20 border-2 border-rose-500/50"
                : "bg-red-600/20 border-2 border-red-500/50"
            }`}>
              <span className="text-4xl">
                {(message.includes("won") || message.includes("You win")) ? "🏆" : "💔"}
              </span>
            </div>
            <h2 className={`text-3xl font-black ${
              (message.includes("won") || message.includes("You win"))
                ? "text-rose-400"
                : "text-red-400"
            }`}>
              {(message.includes("won") || message.includes("You win"))
                ? "Victory!"
                : "Defeat"}
            </h2>
            <p className="text-slate-300 text-sm">{message}</p>
            <div className="flex justify-center gap-8 text-sm">
              <div className="text-center">
                <p className="text-slate-500 text-xs uppercase tracking-wider">You</p>
                <p className="text-2xl font-bold text-slate-100">{gameState?.my_score}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-500 text-xs uppercase tracking-wider">Opponent</p>
                <p className="text-2xl font-bold text-slate-100">{gameState?.opponent_score}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setPhase("idle");
                setGameState(null);
                setGameId(null);
                setMessage("");
                setPointsPopup(null);
              }}
              className="px-8 py-3 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-500 hover:scale-105 transition-all shadow-lg shadow-rose-900/30"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {message && phase === "playing" && message.length > 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <p className="text-sm text-slate-400 bg-slate-900/80 px-4 py-1.5 rounded-lg backdrop-blur-sm border border-slate-700/30">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
