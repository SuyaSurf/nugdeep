"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ─── Easing ─────────────────────────────────────────────────

export function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

export function easeOutElastic(x: number): number {
  const c4 = (2 * Math.PI) / 3;
  if (x === 0 || x === 1) return x;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

export function easeInExpo(x: number): number {
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}

// ─── Screen shake ───────────────────────────────────────────

interface ShakeConfig {
  intensity: number;   // 0-1
  decay?: number;      // per-frame multiplier (default 0.9)
}

export function useScreenShake() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const trauma = useRef(0);
  const frameId = useRef(0);

  const shake = useCallback((intensity: number) => {
    trauma.current = Math.min(1, trauma.current + intensity);
    if (!frameId.current) animate();
  }, []);

  function animate() {
    const t = trauma.current;
    const power = t * t; // squared decay feels natural
    setOffset({
      x: (Math.random() - 0.5) * power * 20,
      y: (Math.random() - 0.5) * power * 20,
    });
    trauma.current *= 0.9; // decay
    if (trauma.current > 0.01) {
      frameId.current = requestAnimationFrame(animate);
    } else {
      frameId.current = 0;
      setOffset({ x: 0, y: 0 });
    }
  }

  useEffect(() => () => cancelAnimationFrame(frameId.current), []);

  return { shake, offset };
}

// ─── 2D Particle burst ──────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
}

interface ParticleBurstConfig {
  count?: number;
  colors?: string[];
  spread?: number;
  gravity?: number;
  lifetime?: number;
  size?: number;
}

export function useParticleBurst(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const particles = useRef<Particle[]>([]);
  const gravityRef = useRef(200);

  const burst = useCallback((x: number, y: number, config?: ParticleBurstConfig) => {
    const c = config?.count ?? 12;
    const colors = config?.colors ?? ["#8b5cf6", "#ec4899", "#f59e0b"];
    const spread = config?.spread ?? 3;
    gravityRef.current = config?.gravity ?? 200;
    const lifetime = config?.lifetime ?? 0.8;
    const size = config?.size ?? 4;

    for (let i = 0; i < c; i++) {
      const angle = (Math.PI * 2 * i) / c + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * spread * 80;
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        life: 1,
        maxLife: lifetime,
        size: size * (0.5 + Math.random() * 0.5),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    if (!canvasRef.current) return;
    startLoop();
  }, [canvasRef]);

  const loopId = useRef(0);
  const lastTime = useRef(0);

  function startLoop() {
    if (loopId.current) return;
    lastTime.current = performance.now();
    function loop(now: number) {
      const dt = (now - lastTime.current) / 1000;
      lastTime.current = now;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const alive: Particle[] = [];
      for (const p of particles.current) {
        p.life -= dt / p.maxLife;
        if (p.life <= 0) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += gravityRef.current * dt;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        alive.push(p);
      }
      particles.current = alive;

      if (alive.length > 0) {
        loopId.current = requestAnimationFrame(loop);
      } else {
        loopId.current = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    loopId.current = requestAnimationFrame(loop);
  }

  useEffect(() => () => cancelAnimationFrame(loopId.current), []);

  return { burst };
}

// ─── Screen flash ───────────────────────────────────────────

export function useScreenFlash() {
  const [flash, setFlash] = useState<{ color: string; opacity: number } | null>(null);

  const flashScreen = useCallback((color: string, duration = 0.2) => {
    setFlash({ color, opacity: 0.4 });
    setTimeout(() => setFlash(null), duration * 1000);
  }, []);

  return { flash, flashScreen };
}

// ─── Timer ring ─────────────────────────────────────────────

// Renders an SVG countdown ring. Returns a component.

export function TimerRing({ seconds, total, size = 128, strokeWidth = 8, color = "#8b5cf6" }: {
  seconds: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const progress = seconds / total;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#374151" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${circ}`}
        strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round"
        className="transition-all duration-1000" />
      <text x={size / 2} y={size / 2 + 4}
        textAnchor="middle" fill="white"
        className="text-2xl font-bold">
        {Math.ceil(seconds)}
      </text>
    </svg>
  );
}
