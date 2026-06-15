"use client";

import { useState } from "react";
import { Check, MapPin } from "lucide-react";
import {
  playExperienceSelect,
  pulseHaptic,
} from "@/components/experience/experience-audio";
import { LOCATIONS } from "@/lib/locations";

interface Props {
  onComplete: (location: string) => void;
}

export function LocationPicker({ onComplete }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [waiting, setWaiting] = useState(false);

  const toggle = (id: string) => {
    playExperienceSelect();
    pulseHaptic("select");
    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter((locationId) => locationId !== id);
      }
      if (current.length === 2) return current;
      return [...current, id];
    });
  };

  const reveal = () => {
    setWaiting(true);
    window.setTimeout(() => {
      const chosen = LOCATIONS.find((location) => location.id === selected[0]);
      onComplete(chosen?.name ?? LOCATIONS[0].name);
    }, 1200);
  };

  return (
    <section className="lobby-step">
      <header className="lobby-step__header">
        <p className="lobby-kicker">The second consent</p>
        <h1>{waiting ? "They are choosing a world." : "Where could this continue?"}</h1>
        <p>
          {waiting
            ? "One shared choice opens the room. A different choice ends the night cleanly."
            : "Choose two places you would be comfortable meeting. They will choose one."}
        </p>
      </header>

      {!waiting && (
        <>
          <div className="location-grid">
            {LOCATIONS.map((location) => {
              const active = selected.includes(location.id);
              return (
                <button
                  type="button"
                  key={location.id}
                  className={`location-card ${active ? "is-selected" : ""}`}
                  onClick={() => toggle(location.id)}
                >
                  <span
                    className="location-card__scene"
                    style={{ background: location.colors }}
                  >
                    <MapPin size={19} aria-hidden="true" />
                    {active && <Check size={20} aria-hidden="true" />}
                  </span>
                  <strong>{location.name}</strong>
                  <span>{location.atmosphere}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="lobby-primary-action"
            disabled={selected.length !== 2}
            onClick={reveal}
          >
            Offer these two worlds
          </button>
        </>
      )}

      {waiting && (
        <div className="location-wait" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </section>
  );
}

