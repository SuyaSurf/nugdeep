"use client";

import { Clock3, MoveUpRight } from "lucide-react";
import type { GameProfile } from "@/lib/games/registry";
import {
  playExperienceSelect,
  pulseHaptic,
} from "@/components/experience/experience-audio";

interface Props {
  games: GameProfile[];
  onSelect: (game: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  nerve: "Nerve",
  reflex: "Reflex",
  psychology: "Read the room",
  social: "Social",
  strategy: "Strategy",
  knowledge: "Knowledge",
  visual: "Observation",
};

export function GamePicker({ games, onSelect }: Props) {
  return (
    <section className="lobby-step">
      <header className="lobby-step__header">
        <p className="lobby-kicker">Tonight&apos;s lineup</p>
        <h1>Pick a game</h1>
        <p>
          One game per category. The board resets at midnight.
        </p>
      </header>

      <div className="game-shelf">
        {games.map((game, index) => (
          <button
            key={game.id}
            type="button"
            data-game-card
            className="game-card"
            style={
              {
                "--game-primary": game.colors.primary,
                "--game-accent": game.colors.accent,
                "--game-bg": game.colors.bg,
              } as React.CSSProperties
            }
            onClick={() => {
              playExperienceSelect();
              pulseHaptic("select");
              onSelect(game.id);
            }}
          >
            <span className="game-card__index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="game-card__genre">
              {CATEGORY_LABELS[game.category] ?? game.category}
            </span>
            <span className="game-card__orb" aria-hidden="true">
              <i />
            </span>
            <span className="game-card__copy">
              <strong>{game.name}</strong>
              <span>{game.description}</span>
            </span>
            <span className="game-card__meta">
              <span>
                <Clock3 size={13} aria-hidden="true" />
                {game.matchTime}s
              </span>
              <MoveUpRight size={17} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

