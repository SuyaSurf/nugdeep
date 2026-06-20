"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Check } from "lucide-react";
import { ExperienceShell } from "@/components/experience/ExperienceShell";
import {
  playExperienceSelect,
  pulseHaptic,
} from "@/components/experience/experience-audio";
import { useExperienceEventStore } from "@/lib/experience/event-store";
import { getGame, getReadyGames } from "@/lib/games/registry";
import { getEngineOrDefault } from "@/lib/games/engines";
import type { GameResult } from "@/lib/games/game-engine";
import type { Activity } from "@/lib/lobby";
import { getTodaysActivity, joinQueue, leaveQueue, reportGameResult, startAIGame } from "@/lib/lobby";
import {
  getDailyGameLineup,
  getDayKey,
  getFallbackDailyActivity,
  getIntentHandoff,
  getIntentOptions,
  type LobbyIntent,
} from "@/lib/lobby-experience";
import { useWsStore } from "@/lib/stores/ws-store";
import { GameShell } from "@/components/game/GameShell";
import { IntentStep } from "./intent-step";
import { ActivityStep } from "./activity-step";
import { GamePicker } from "./game-picker";
import { MatchmakingStatus } from "./matchmaking-status";
import { MatchedScreen } from "./matched-screen";
import { LocationPicker } from "./location-picker";
import { NoMatch } from "./no-match";
import { SocialHandoff } from "./social-handoff";
import { DateRoom } from "./date-room";

type Phase =
  | "intent"
  | "game"
  | "activity"
  | "queued"
  | "matched"
  | "playing"
  | "location"
  | "chat"
  | "date_room"
  | "results"
  | "no_match";

type TokenProvider = () => Promise<string | null>;

const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

export default function LobbyPage() {
  return clerkEnabled ? <AuthenticatedLobby /> : <LobbyExperience demo />;
}

function AuthenticatedLobby() {
  const { getToken, userId } = useAuth();
  return (
    <LobbyExperience
      tokenProvider={() => getToken()}
      userId={userId ?? ""}
    />
  );
}

function LobbyExperience({
  demo = false,
  tokenProvider,
  userId = "",
}: {
  demo?: boolean;
  tokenProvider?: TokenProvider;
  userId?: string;
}) {
  const dayKey = useMemo(() => getDayKey(), []);
  const lineup = useMemo(
    () => getDailyGameLineup(getReadyGames(), dayKey),
    [dayKey],
  );
  const demoMatchTimer = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>("intent");
  const [activity, setActivity] = useState<Activity>(
    getFallbackDailyActivity(dayKey),
  );
  const [intent, setIntent] = useState<LobbyIntent>("just_play");
  const [choice, setChoice] = useState("");
  const [game, setGame] = useState("");
  const [matchId, setMatchId] = useState("");
  const [opponent, setOpponent] = useState("Signal 27");
  const [aiLevel, setAiLevel] = useState<number | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [gameResult, setGameResult] = useState<{ myScore: number; theirScore: number } | null>(null);

  const emit = useExperienceEventStore((s) => s.emit);
  const gameProfile = getGame(game);
  const intentProfile = getIntentOptions().find((item) => item.id === intent);
  const choiceProfile = activity.options.find((item) => item.value === choice);

  useEffect(() => {
    getTodaysActivity().then(setActivity).catch(() => {
      setActivity(getFallbackDailyActivity(dayKey));
    });
  }, [dayKey]);

  useEffect(() => {
    if (phase !== "queued" || demo || !userId) return;

    const { connect, disconnect, subscribe } = useWsStore.getState();
    tokenProvider?.().then((token) => {
      connect("lobby", token, [`user:${userId}`]);
    });

    const unsub = subscribe("lobby", (msg) => {
      if ((msg as Record<string, unknown>).type === "lobby:matched") {
        const payload = (msg as Record<string, unknown>).payload as Record<string, unknown>;
        setMatchId(payload.match_id as string);
        setOpponent((payload.opponent as string) || "Another signal");
        setPhase("matched");
      }
    });

    return () => {
      unsub();
      disconnect("lobby");
    };
  }, [demo, phase, tokenProvider, userId]);

  useEffect(
    () => () => {
      if (demoMatchTimer.current) {
        window.clearTimeout(demoMatchTimer.current);
      }
    },
    [],
  );

  const selectIntent = useCallback((selected: LobbyIntent) => {
    setIntent(selected);
    setPhase("game");
  }, []);

  const selectGame = useCallback((selected: string) => {
    setGame(selected);
    setPhase("activity");
  }, []);

  const queueChoice = useCallback(
    async (selected: string) => {
      setChoice(selected);
      setPhase("queued");

      emit({
        type: "queue_searching",
        payload: { intent, game, choice: selected },
      });

      if (demo) {
        demoMatchTimer.current = window.setTimeout(() => {
          setMatchId(`preview-${dayKey}`);
          setOpponent("Signal 27");
          setPhase("matched");
        }, 3400);
        return;
      }

      try {
        const token = await tokenProvider?.();
        const response = await joinQueue(
          {
            intent,
            game,
            activity_code: `activity_${activity.day_of_year}`,
            choice: selected,
          },
          token,
        );
        if (response.status === "matched") {
          setMatchId(response.match_id ?? "");
          setOpponent("A nearby signal");
          setPhase("matched");
        }
      } catch {
        setPhase("no_match");
      }
    },
    [activity.day_of_year, dayKey, demo, game, intent, tokenProvider],
  );

  const cancelQueue = useCallback(async () => {
    if (demoMatchTimer.current) {
      window.clearTimeout(demoMatchTimer.current);
    }
    if (!demo) {
      const token = await tokenProvider?.();
      await leaveQueue(token).catch(() => undefined);
    }
    setPhase("activity");
  }, [demo, tokenProvider]);

  const finishGame = (result?: GameResult) => {
    if (result) {
      setGameResult({ myScore: result.myScore, theirScore: result.theirScore });

      emit({
        type: "game_over",
        payload: {
          gameId: matchId,
          outcome: result.winner === "me" ? "win" : result.winner === "them" ? "lose" : "draw",
          myScore: result.myScore,
          theirScore: result.theirScore,
          opponent,
        },
      });

      if (!demo && matchId && userId && !matchId.startsWith("ai_") && !matchId.startsWith("preview_")) {
        const winnerId = result.winner === "me" ? userId : result.winner === "them" ? opponent : userId;
        tokenProvider?.().then((token) => {
          reportGameResult(matchId, winnerId, token).catch(() => {});
        });
      }
    }
    const handoff = getIntentHandoff(intent);
    if (handoff === "location_picker") setPhase("location");
    if (handoff === "friend_chat") setPhase("chat");
    if (handoff === "results") setPhase("results");
  };

  const playAI = useCallback(async (characterId: string) => {
    const char = (await import("@/lib/ai-characters")).getAICharacter(characterId);
    const aiName = char?.name ?? "AI";
    const aiLevel = char?.level ?? 2;
    if (demo) {
      setMatchId(`ai_preview_${dayKey}`);
      setOpponent(aiName);
      setAiLevel(aiLevel);
      setPhase("matched");
      return;
    }
    try {
      const token = await tokenProvider?.();
      const resp = await startAIGame(token);
      setMatchId(resp.match_id);
      setOpponent(aiName);
      setAiLevel(aiLevel);
      setPhase("matched");
    } catch {
      setMatchId(`ai_fallback_${dayKey}`);
      setOpponent(aiName);
      setAiLevel(aiLevel);
      setPhase("matched");
    }
  }, [demo, dayKey, tokenProvider]);

  const reset = () => {
    setPhase("intent");
    setChoice("");
    setGame("");
    setMatchId("");
    setLocation("");
  };

  const goBack = () => {
    playExperienceSelect();
    pulseHaptic("select");
    if (phase === "game") setPhase("intent");
    if (phase === "activity") setPhase("game");
  };

  const step = phase === "intent" ? 1 : phase === "game" ? 2 : 3;
  const canGoBack = phase === "game" || phase === "activity";

  return (
    <ExperienceShell
      label="Bammby lobby"
      compactPresence={phase !== "intent"}
      className="lobby-experience"
    >
      <div className="lobby-frame">
        <header className="lobby-journey">
          <div className="lobby-journey__left">
            {canGoBack ? (
              <button type="button" onClick={goBack} aria-label="Go back">
                <ArrowLeft size={17} />
              </button>
            ) : (
              <span className="lobby-journey__mark">B</span>
            )}
            <span>
              {phase === "queued" || phase === "matched"
                ? "Finding a match"
                : phase === "playing" ? "In game" : "Lobby"}
            </span>
          </div>

          {["intent", "game", "activity"].includes(phase) && (
            <div className="lobby-journey__progress" aria-label={`Step ${step} of 3`}>
              <span className={step >= 1 ? "is-active" : ""} />
              <span className={step >= 2 ? "is-active" : ""} />
              <span className={step >= 3 ? "is-active" : ""} />
              <small>{step}/3</small>
            </div>
          )}
        </header>

        {phase === "intent" && <IntentStep onSelect={selectIntent} />}
        {phase === "game" && (
          <GamePicker games={lineup} onSelect={selectGame} />
        )}
        {phase === "activity" && (
          <ActivityStep activity={activity} onSelect={queueChoice} />
        )}
        {phase === "queued" && (
          <MatchmakingStatus
            intentLabel={intentProfile?.label ?? "Play"}
            gameName={gameProfile?.name ?? "Tonight's game"}
            choiceLabel={choiceProfile?.label ?? choice}
            onTimeout={() => setPhase("no_match")}
            onCancel={cancelQueue}
          />
        )}
        {phase === "matched" && (
          <MatchedScreen
            opponent={opponent}
            gameName={gameProfile?.name ?? "tonight's game"}
            onGameStart={() => setPhase("playing")}
          />
        )}
        {phase === "playing" && (
          <GameShell
            engine={getEngineOrDefault(game)}
            matchId={matchId || undefined}
            aiLevel={aiLevel}
            onComplete={(result) => finishGame(result)}
          />
        )}
        {phase === "location" && (
          <LocationPicker
            matchId={matchId || undefined}
            tokenProvider={clerkEnabled ? tokenProvider : undefined}
            onComplete={(selectedLocation) => {
              setLocation(selectedLocation);
              setPhase(intent === "speed_date" ? "date_room" : "chat");
            }}
          />
        )}
        {phase === "date_room" && (
          <DateRoom onExit={() => setPhase("chat")} />
        )}
        {phase === "chat" && (
          <SocialHandoff
            intent={intent}
            opponent={opponent}
            location={location}
            onExit={reset}
          />
        )}
        {phase === "results" && (
          <section className="result-stage">
            <span className="result-stage__score">{gameResult?.myScore ?? 0}:{gameResult?.theirScore ?? 0}</span>
            <p className="lobby-kicker">Match over</p>
            <h1>Final score</h1>
            <p>
              <strong>{gameResult?.myScore ?? 0}</strong>–<strong>{gameResult?.theirScore ?? 0}</strong> vs{" "}
              <strong>{opponent}</strong>. Back to lobby or play again.
            </p>
            <button type="button" className="lobby-primary-action" onClick={reset}>
              Back to lobby
            </button>
          </section>
        )}
        {phase === "no_match" && (
          <NoMatch
            onRetry={() => {
              if (choice) queueChoice(choice);
              else setPhase("activity");
            }}
            onChange={() => setPhase("game")}
            onPlayAI={(charId) => playAI(charId)}
          />
        )}
      </div>
    </ExperienceShell>
  );
}
