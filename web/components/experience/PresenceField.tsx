"use client";

const PRESENCES = [
  { x: "9%", y: "64%", delay: "-1.2s", scale: "0.72", color: "#8e9dff" },
  { x: "20%", y: "36%", delay: "-4.8s", scale: "0.5", color: "#b8ff72" },
  { x: "35%", y: "73%", delay: "-2.9s", scale: "0.86", color: "#ff9368" },
  { x: "48%", y: "22%", delay: "-0.6s", scale: "0.38", color: "#9b7bff" },
  { x: "58%", y: "28%", delay: "-6.1s", scale: "0.44", color: "#8e9dff" },
  { x: "68%", y: "68%", delay: "-3.7s", scale: "0.78", color: "#b8ff72" },
  { x: "83%", y: "43%", delay: "-5.3s", scale: "0.56", color: "#ff9368" },
  { x: "92%", y: "76%", delay: "-0.8s", scale: "0.9", color: "#8e9dff" },
  { x: "15%", y: "82%", delay: "-2.1s", scale: "0.62", color: "#68a8ff" },
  { x: "42%", y: "54%", delay: "-7.2s", scale: "0.48", color: "#ff6f61" },
  { x: "73%", y: "14%", delay: "-1.9s", scale: "0.34", color: "#9b7bff" },
  { x: "55%", y: "88%", delay: "-4.4s", scale: "0.7", color: "#68a8ff" },
  { x: "28%", y: "12%", delay: "-3.3s", scale: "0.4", color: "#b8ff72" },
  { x: "88%", y: "58%", delay: "-5.8s", scale: "0.54", color: "#ff9368" },
  { x: "6%", y: "44%", delay: "-0.3s", scale: "0.66", color: "#8e9dff" },
] as const;

export function PresenceField({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`presence-field ${compact ? "presence-field--compact" : ""}`}
      aria-hidden="true"
    >
      {PRESENCES.map((presence, index) => (
        <span
          key={index}
          className="presence-signal"
          style={
            {
              "--presence-x": presence.x,
              "--presence-y": presence.y,
              "--presence-delay": presence.delay,
              "--presence-scale": presence.scale,
              "--presence-color": presence.color,
              "--presence-index": String(index),
            } as React.CSSProperties
          }
        >
          <span className="presence-signal__head" />
          <span className="presence-signal__body" />
          <span className="presence-signal__ring" />
        </span>
      ))}
    </div>
  );
}
