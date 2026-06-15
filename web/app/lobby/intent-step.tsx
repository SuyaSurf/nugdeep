"use client";

import { Gamepad2, Heart, Radio } from "lucide-react";
import {
  getIntentOptions,
  type LobbyIntent,
} from "@/lib/lobby-experience";
import {
  playExperienceSelect,
  pulseHaptic,
} from "@/components/experience/experience-audio";

interface Props {
  onSelect: (intent: LobbyIntent) => void;
}

const ICONS = {
  speed_date: Heart,
  make_friend: Radio,
  just_play: Gamepad2,
};

export function IntentStep({ onSelect }: Props) {
  return (
    <section className="lobby-step lobby-step--intent">
      <header className="lobby-step__header">
        <p className="lobby-kicker">The first door</p>
        <h1>Why did you come tonight?</h1>
        <p>
          No profile parade. No endless swiping. Choose the kind of encounter
          you are open to, and the building does the rest.
        </p>
      </header>

      <div className="intent-grid">
        {getIntentOptions().map((intent) => {
          const Icon = ICONS[intent.id];
          return (
            <button
              key={intent.id}
              type="button"
              className="intent-card"
              style={{ "--intent-accent": intent.accent } as React.CSSProperties}
              onClick={() => {
                playExperienceSelect();
                pulseHaptic("select");
                onSelect(intent.id);
              }}
              aria-label={`${intent.label}. ${intent.description}`}
            >
              <span className="intent-card__number">{intent.number}</span>
              <Icon className="intent-card__icon" aria-hidden="true" />
              <span className="intent-card__copy">
                <strong>{intent.label}</strong>
                <span>{intent.description}</span>
              </span>
              <small>{intent.promise}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

