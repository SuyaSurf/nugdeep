"use client";

import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import {
  playExperienceReveal,
  pulseHaptic,
} from "@/components/experience/experience-audio";
import { useExperienceEventStore } from "@/lib/experience/event-store";

interface Props {
  opponent: string;
  gameName: string;
  onGameStart: () => void;
}

export function MatchedScreen({
  opponent,
  gameName,
  onGameStart,
}: Props) {
  const emit = useExperienceEventStore((s) => s.emit);

  useEffect(() => {
    emit({ type: "match_found", payload: { gameId: "", opponent, game: gameName } });
  }, []);

  return (
    <section className="matched-stage">
      <div className="matched-stage__signals" aria-hidden="true">
        <span className="matched-stage__signal matched-stage__signal--you">
          <i />
        </span>
        <span className="matched-stage__thread" />
        <span className="matched-stage__signal matched-stage__signal--them">
          <i />
        </span>
      </div>

      <p className="lobby-kicker">Player found</p>
      <h1>{opponent || "Someone"} is ready.</h1>
      <p>
        Same picks. Same game.
      </p>

      <button
        type="button"
        className="lobby-primary-action"
        onClick={() => {
          playExperienceReveal();
          pulseHaptic("match");
          emit({ type: "game_start", payload: { gameId: "", game: gameName } });
          onGameStart();
        }}
      >
        Start game
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}
