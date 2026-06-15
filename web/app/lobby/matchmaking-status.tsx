"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Props {
  intentLabel: string;
  gameName: string;
  choiceLabel: string;
  onTimeout: () => void;
  onCancel: () => void;
}

export function MatchmakingStatus({
  intentLabel,
  gameName,
  choiceLabel,
  onTimeout,
  onCancel,
}: Props) {
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          onTimeout();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onTimeout]);

  return (
    <section className="matching-stage">
      <button
        type="button"
        className="matching-stage__cancel"
        onClick={onCancel}
        aria-label="Leave matchmaking"
      >
        <X size={17} />
      </button>

      <div className="matching-radar" aria-hidden="true">
        <span className="matching-radar__ring matching-radar__ring--one" />
        <span className="matching-radar__ring matching-radar__ring--two" />
        <span className="matching-radar__ring matching-radar__ring--three" />
        <span className="matching-radar__self" />
        <span className="matching-radar__other" />
        <span className="matching-radar__line" />
      </div>

      <p className="lobby-kicker">The building is listening</p>
      <h1>Listening for someone on your frequency.</h1>
      <p className="matching-stage__copy">
        Matching {intentLabel.toLowerCase()}, <strong>{gameName}</strong>, and
        the choice <strong>{choiceLabel}</strong>.
      </p>

      <div className="matching-stage__timer">
        <span>{seconds}s</span>
        <i style={{ "--queue-progress": `${(seconds / 30) * 100}%` } as React.CSSProperties} />
      </div>
    </section>
  );
}

