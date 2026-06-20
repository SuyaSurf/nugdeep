"use client";

import { useCallback, useRef } from "react";
import { PresenceField } from "./PresenceField";

interface ExperienceShellProps {
  children: React.ReactNode;
  label?: string;
  compactPresence?: boolean;
  className?: string;
}

export function ExperienceShell({
  children,
  label = "Bammby night lobby",
  compactPresence = false,
  className = "",
}: ExperienceShellProps) {
  const shellRef = useRef<HTMLElement>(null);

  const moveLight = useCallback((clientX: number, clientY: number) => {
    const shell = shellRef.current;
    if (!shell) return;
    const bounds = shell.getBoundingClientRect();
    const x = ((clientX - bounds.left) / bounds.width) * 100;
    const y = ((clientY - bounds.top) / bounds.height) * 100;
    shell.style.setProperty("--pointer-x", `${x}%`);
    shell.style.setProperty("--pointer-y", `${y}%`);
    shell.style.setProperty("--tilt-x", `${(y - 50) * -0.035}deg`);
    shell.style.setProperty("--tilt-y", `${(x - 50) * 0.035}deg`);
  }, []);

  return (
    <main
      ref={shellRef}
      className={`experience-shell ${className}`}
      aria-label={label}
      onPointerMove={(event) => moveLight(event.clientX, event.clientY)}
      onPointerDown={(event) => moveLight(event.clientX, event.clientY)}
    >
      <div className="experience-world" aria-hidden="true">
        <div className="experience-world__sky" />
        <div className="experience-world__moon" />
        <div className="experience-world__building">
          <div className="experience-world__sign">BAMMBY</div>
          <div className="experience-world__door">
            <span />
          </div>
        </div>
        <div className="experience-world__floor" />
        <div className="experience-world__beam" />
        <div className="experience-world__fog experience-world__fog--one" />
        <div className="experience-world__fog experience-world__fog--two" />
        <div className="experience-world__grain" />
        <PresenceField compact={compactPresence} />
      </div>

      <div className="experience-content">{children}</div>
    </main>
  );
}
