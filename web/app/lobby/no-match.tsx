"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { pickAICharacters, getAICharacter, type AICharacter } from "@/lib/ai-characters";
import {
  playExperienceSelect,
  pulseHaptic,
} from "@/components/experience/experience-audio";
import { useExperienceEventStore } from "@/lib/experience/event-store";

interface Props {
  onRetry: () => void;
  onChange: () => void;
  onPlayAI: (characterId: string) => void;
}

export function NoMatch({ onRetry, onChange, onPlayAI }: Props) {
  const [characters] = useState(() => pickAICharacters(2, `${Date.now()}`));
  const [picked, setPicked] = useState<string | null>(null);
  const emit = useExperienceEventStore((s) => s.emit);

  useEffect(() => {
    emit({ type: "no_match", payload: { intent: "", game: "" } });
  }, []);

  const handlePick = (id: string) => {
    playExperienceSelect();
    pulseHaptic("select");
    const char = getAICharacter(id);
    setPicked(id);
    emit({ type: "ai_selected", payload: { characterId: id, characterName: char?.name ?? "AI" } });
    onPlayAI(id);
  };

  return (
    <section className="empty-stage">
      <span className="empty-stage__signal" aria-hidden="true" />
      <p className="lobby-kicker">No match found</p>
      <h1>No one picked the same combination.</h1>
      <p>
        Try again or change your game.
      </p>

      <div className="empty-stage__agents">
        <p className="empty-stage__agents-label">Play against the house:</p>
        <div className="empty-stage__agents-grid">
          {characters.map((char) => (
            <button
              key={char.id}
              type="button"
              className="agent-card"
              style={{ "--agent-accent": char.accent } as React.CSSProperties}
              onClick={() => handlePick(char.id)}
              disabled={picked !== null}
            >
              <span className="agent-card__level">L{char.level}</span>
              <span className="agent-card__name">{char.name}</span>
              <span className="agent-card__tagline">{char.tagline}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="empty-stage__actions">
        <button type="button" className="lobby-primary-action" onClick={onRetry}>
          <RotateCcw size={17} />
          Try again
        </button>
        <button type="button" className="lobby-secondary-action" onClick={onChange}>
          <ArrowLeft size={17} />
          Change game
        </button>
      </div>
    </section>
  );
}
