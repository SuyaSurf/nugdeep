"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";

interface Props {
  onRetry: () => void;
  onChange: () => void;
}

export function NoMatch({ onRetry, onChange }: Props) {
  return (
    <section className="empty-stage">
      <span className="empty-stage__signal" aria-hidden="true" />
      <p className="lobby-kicker">No answer yet</p>
      <h1>The room went quiet.</h1>
      <p>
        Your choices are still here. Listen again on the same frequency, or
        step back and choose another game.
      </p>
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

