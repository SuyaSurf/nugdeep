"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import { useState } from "react";
import { pickAICharacters, getAICharacter, type AICharacter } from "@/lib/ai-characters";
import {
  playExperienceSelect,
  pulseHaptic,
} from "@/components/experience/experience-audio";

interface Props {
  onRetry: () => void;
  onChange: () => void;
  onPlayAI: (characterId: string) => void;
}

export function NoMatch({ onRetry, onChange, onPlayAI }: Props) {
  const [characters] = useState(() => pickAICharacters(2, `${Date.now()}`));
  const [picked, setPicked] = useState<string | null>(null);

  const handlePick = (id: string) => {
    playExperienceSelect();
    pulseHaptic("select");
    setPicked(id);
    onPlayAI(id);
  };

  return (
    <section className="empty-stage">
      <span className="empty-stage__signal" aria-hidden="true" />
      <p className="lobby-kicker">No answer yet</p>
      <h1>The room went quiet.</h1>
      <p>
        No one matched on those choices. Try the same combination again.
      </p>

      <div className="empty-stage__agents">
        <p className="empty-stage__agents-label">Play with an agent from the building:</p>
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
          Listen again
        </button>
        <button type="button" className="lobby-secondary-action" onClick={onChange}>
          <ArrowLeft size={17} />
          Change the route
        </button>
      </div>
    </section>
  );
}
