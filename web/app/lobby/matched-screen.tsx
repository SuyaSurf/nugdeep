"use client";

import { ArrowRight } from "lucide-react";
import {
  playExperienceReveal,
  pulseHaptic,
} from "@/components/experience/experience-audio";

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

      <p className="lobby-kicker">Frequency locked</p>
      <h1>Someone matched on your frequency.</h1>
      <p>
        <strong>{opponent || "Someone"}</strong> chose the same way into{" "}
        <strong>{gameName}</strong>.
      </p>

      <button
        type="button"
        className="lobby-primary-action"
        onClick={() => {
          playExperienceReveal();
          pulseHaptic("match");
          onGameStart();
        }}
      >
        Enter the game
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}

