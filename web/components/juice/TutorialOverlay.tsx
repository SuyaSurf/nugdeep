// web/components/juice/TutorialOverlay.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const STORAGE_KEY = "bammby-tutorial-dismissed";

interface Step {
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { title: "Welcome to Bammby", body: "A game center for strangers. Walk in alone, choose what you came for, and leave with a story." },
  { title: "Pick a game", body: "Each night offers a different ritual. Face a real opponent in under three minutes." },
  { title: "Win or learn", body: "After the round, rematch, chat, or leave. The night lobby is open." },
];

export function TutorialOverlay() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const el = panelRef.current;
    if (!el || !open) return;
    gsap.fromTo(el, { opacity: 0, y: 20, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.4)" });
  }, [open, step]);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else dismiss();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Tutorial"
    >
      <div
        ref={panelRef}
        style={{
          maxWidth: 400,
          width: "90%",
          padding: "2rem",
          borderRadius: "1rem",
          background: "linear-gradient(135deg, #0f172a, #1e1b4b)",
          border: "1px solid rgba(255,255,255,0.1)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 4,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 2,
            marginBottom: "1.5rem",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
              height: "100%",
              background: "#8b5cf6",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          {STEPS[step].title}
        </h2>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          {STEPS[step].body}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#8b5cf6",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {step < STEPS.length - 1 ? "Next" : "Enter the lobby"}
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          style={{
            marginTop: "1rem",
            fontSize: "0.875rem",
            color: "#64748b",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Skip tutorial
        </button>
      </div>
    </div>
  );
}
