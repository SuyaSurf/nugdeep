// web/lib/juice/animation-director.ts
"use client";

import gsap from "gsap";

let reducedMotion = false;

export function setReducedMotion(value: boolean) {
  reducedMotion = value;
}

export function isReducedMotion(): boolean {
  return reducedMotion;
}

// ── Page Transitions ──

export function fadeOut(el: HTMLElement, duration = 0.25): Promise<void> {
  if (reducedMotion) { el.style.display = "none"; return Promise.resolve(); }
  return new Promise((resolve) => {
    gsap.to(el, { opacity: 0, duration, onComplete: () => { el.style.display = "none"; resolve(); } });
  });
}

export function fadeIn(el: HTMLElement, duration = 0.35): Promise<void> {
  if (reducedMotion) { el.style.display = ""; el.style.opacity = "1"; return Promise.resolve(); }
  return new Promise((resolve) => {
    el.style.display = "";
    gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration, ease: "power2.out", onComplete: resolve });
  });
}

export function scaleIn(el: HTMLElement, duration = 0.4): Promise<void> {
  if (reducedMotion) { el.style.display = ""; el.style.transform = "scale(1)"; return Promise.resolve(); }
  return new Promise((resolve) => {
    el.style.display = "";
    gsap.fromTo(el, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration, ease: "back.out(1.7)", onComplete: resolve });
  });
}

// ── Micro-interactions ──

export function buttonHover(btn: HTMLElement) {
  if (reducedMotion) return;
  gsap.to(btn, { scale: 1.04, duration: 0.15, ease: "power1.out" });
}

export function buttonLeave(btn: HTMLElement) {
  if (reducedMotion) return;
  gsap.to(btn, { scale: 1, duration: 0.15, ease: "power1.out" });
}

export function buttonPress(btn: HTMLElement) {
  if (reducedMotion) return;
  gsap.to(btn, { scale: 0.96, duration: 0.08, ease: "power1.out", yoyo: true, repeat: 1 });
}

// ── Ceremony Sequences ──

export function matchFoundSequence(container: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: reducedMotion });
  if (reducedMotion) return tl;
  tl.fromTo(container, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" })
    .to(container, { boxShadow: "0 0 60px rgba(139,92,246,0.6)", duration: 0.3 }, "-=0.2")
    .to(container, { boxShadow: "0 0 0px rgba(139,92,246,0)", duration: 0.5 });
  return tl;
}

export function gameOverSequence(container: HTMLElement, outcome: "win" | "lose"): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: reducedMotion });
  if (reducedMotion) return tl;
  const color = outcome === "win" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)";
  tl.fromTo(container, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" })
    .to(container, { boxShadow: `0 0 80px ${color}`, duration: 0.6 }, "-=0.2");
  return tl;
}

export function scoreRevealSequence(el: HTMLElement, targetScore: number): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: reducedMotion });
  if (reducedMotion) { el.textContent = String(targetScore); return tl; }
  const decimals = (String(targetScore).split(".")[1] ?? "").length;
  const obj = { val: 0 };
  tl.to(obj, {
    val: targetScore,
    duration: 0.8,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = decimals > 0 ? obj.val.toFixed(decimals) : String(Math.round(obj.val));
    },
  });
  return tl;
}

export function chatUnlockedSequence(container: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: reducedMotion });
  if (reducedMotion) return tl;
  tl.fromTo(container, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" })
    .to(container, { borderColor: "rgba(139,92,246,0.5)", duration: 0.3 });
  return tl;
}

// ── Timer Urgency ──

export function timerUrgent(el: HTMLElement | SVGElement, seconds: number) {
  if (reducedMotion) return;
  const urgency = Math.max(0, 1 - seconds / 5);
  gsap.to(el, {
    scale: 1 + urgency * 0.08,
    color: urgency > 0.5 ? "#ef4444" : "#f59e0b",
    duration: 0.2,
    ease: "power1.out",
  });
}

// ── Particles ──

export function confettiBurst(origin: { x: number; y: number }, container?: HTMLElement) {
  if (reducedMotion) return;
  const count = 20;
  const colors = ["#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6"];
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.style.cssText = `
      position: fixed; left: ${origin.x}px; top: ${origin.y}px;
      width: 6px; height: 6px; border-radius: 50%;
      background: ${colors[i % colors.length]};
      pointer-events: none; z-index: 9999;
    `;
    (container ?? document.body).appendChild(el);
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 60 + Math.random() * 120;
    gsap.to(el, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 60,
      opacity: 0,
      scale: 0,
      duration: 0.6 + Math.random() * 0.4,
      ease: "power2.out",
      onComplete: () => el.remove(),
    });
  }
}

export function screenFlash(color = "#8b5cf6") {
  if (reducedMotion) return;
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;inset:0;background:${color};opacity:0;pointer-events:none;z-index:9998;`;
  document.body.appendChild(el);
  gsap.to(el, { opacity: 0.25, duration: 0.08, yoyo: true, repeat: 1, onComplete: () => el.remove() });
}
