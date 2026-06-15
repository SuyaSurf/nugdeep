"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Check, Swords } from "lucide-react";
import { ExperienceShell } from "@/components/experience/ExperienceShell";
import {
  playExperienceSelect,
  pulseHaptic,
} from "@/components/experience/experience-audio";
import { getGame, getReadyGames } from "@/lib/games/registry";
import type { Activity } from "@/lib/lobby";
import { getTodaysActivity, joinQueue, leaveQueue } from "@/lib/lobby";
import {
  getDailyGameLineup,
  getDayKey,
  getFallbackDailyActivity,
  getIntentHandoff,
  getIntentOptions,
  type LobbyIntent,
} from "@/lib/lobby-experience";
import { wsConnectRooms } from "@/lib/api";
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
  const [location, setLocation] = useState("");

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

    let socket: WebSocket | null = null;
    let cancelled = false;
    tokenProvider?.().then((token) => {
      if (cancelled) return;
      socket = wsConnectRooms(token, [`user:${userId}`]);
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type !== "lobby:matched") return;
          setMatchId(message.payload.match_id);
          setOpponent(message.payload.opponent || "Another signal");
          setPhase("matched");
        } catch {}
      });
    });

    return () => {
      cancelled = true;
      socket?.close();
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

  const finishGame = () => {
    const handoff = getIntentHandoff(intent);
    if (handoff === "location_picker") setPhase("location");
    if (handoff === "friend_chat") setPhase("chat");
    if (handoff === "results") setPhase("results");
  };

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
      label="Inside the Bammby game center"
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
                ? "Pairing chamber"
                : "Lobby walk"}
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
          <section className="game-chamber">
            <div
              className="game-chamber__artifact"
              style={
                {
                  "--artifact-primary": gameProfile?.colors.primary ?? "#8e9dff",
                  "--artifact-accent": gameProfile?.colors.accent ?? "#b8ff72",
                } as React.CSSProperties
              }
              aria-hidden="true"
            >
              <span />
              <i />
              <Swords />
            </div>
            <p className="lobby-kicker">Shared table / {intentProfile?.shortLabel}</p>
            <h1>{gameProfile?.name}</h1>
            <p>
              You and {opponent} are at the same table. This shell hands off to
              the live game engine when the round starts.
            </p>
            <div className="game-chamber__players">
              <span>You / ready</span>
              <span>{opponent} / ready</span>
            </div>
            <button
              type="button"
              className="lobby-primary-action"
              onClick={finishGame}
            >
              Finish the round
              <Check size={18} />
            </button>
          </section>
        )}
        {phase === "location" && (
          <LocationPicker
            onComplete={(selectedLocation) => {
              setLocation(selectedLocation);
              setPhase(intent === "speed_date" ? "date_room" : "chat");
            }}
          />
        )}
        {phase === "date_room" && (
          <DateRoom onExit={reset} />
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
            <span className="result-stage__score">1:0</span>
            <p className="lobby-kicker">The clean exit</p>
            <h1>Good game. Nothing owed.</h1>
            <p>
              The score stays. Identities do not. You can listen for another
              opponent or step back outside.
            </p>
            <button type="button" className="lobby-primary-action" onClick={reset}>
              Return to the lobby
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
          />
        )}
      </div>
    </ExperienceShell>
  );
}
