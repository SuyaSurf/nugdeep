"use client";

import type { Activity } from "@/lib/lobby";
import {
  playExperienceSelect,
  pulseHaptic,
} from "@/components/experience/experience-audio";

interface Props {
  activity: Activity;
  onSelect: (choice: string) => void;
}

const COLOR_SWATCHES: Record<string, string> = {
  red: "#ff6f61",
  ember: "#ff9368",
  orange: "#ff9f43",
  yellow: "#f5d76e",
  green: "#75d69c",
  signal: "#b8ff72",
  blue: "#68a8ff",
  midnight: "#4054a8",
  purple: "#9b7bff",
  violet: "#a686ff",
};

export function ActivityStep({ activity, onSelect }: Props) {
  const isColor = activity.type === "color_picker";
  const isNumber = activity.type === "number_picker";

  return (
    <section className="lobby-step lobby-step--activity">
      <header className="lobby-step__header">
        <p className="lobby-kicker">Tonight&apos;s ritual</p>
        <h1>One small choice before the doors open.</h1>
        <p>{activity.prompt}</p>
      </header>

      <div
        className={`activity-grid ${
          isColor ? "activity-grid--colors" : ""
        } ${isNumber ? "activity-grid--numbers" : ""}`}
      >
        {activity.options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            data-activity-option
            className="activity-option"
            onClick={() => {
              playExperienceSelect();
              pulseHaptic("select");
              onSelect(option.value);
            }}
          >
            {isColor ? (
              <span
                className="activity-option__swatch"
                style={{
                  background:
                    COLOR_SWATCHES[option.value] ??
                    `hsl(${index * 55} 72% 62%)`,
                }}
              />
            ) : (
              <span className="activity-option__glyph">
                {option.icon ?? option.label.slice(0, 2)}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      <p className="activity-note">
        There is no correct answer. It simply helps two similar signals find
        each other.
      </p>
    </section>
  );
}

