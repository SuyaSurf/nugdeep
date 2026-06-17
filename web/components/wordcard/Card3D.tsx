"use client";

import * as THREE from "three";
import { useMemo } from "react";

interface Card3DProps {
  word?: string;
  faceUp?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  onClick?: () => void;
  scale?: number;
  highlight?: boolean;
}

const CARD_W = 0.9;
const CARD_H = 1.3;

export default function Card3D({
  word = "",
  faceUp = true,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onClick,
  scale = 1,
  highlight = false,
}: Card3DProps) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 180;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = highlight ? "#0f172a" : "#1e293b";
    roundRect(ctx, 0, 0, 128, 180, 6);
    ctx.fill();

    ctx.strokeStyle = highlight ? "#10b981" : "#334155";
    ctx.lineWidth = highlight ? 3 : 1.5;
    roundRect(ctx, 1, 1, 126, 178, 6);
    ctx.stroke();

    if (faceUp && word) {
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 18px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const display = word.length > 8 ? word.slice(0, 7) + "…" : word;
      ctx.fillText(display.toUpperCase(), 64, 90);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [word, faceUp, highlight]);

  const backTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 180;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#0f172a";
    roundRect(ctx, 0, 0, 128, 180, 6);
    ctx.fill();

    const grad = ctx.createLinearGradient(20, 20, 108, 160);
    grad.addColorStop(0, "#1e3a5f");
    grad.addColorStop(0.5, "#0f172a");
    grad.addColorStop(1, "#1e3a5f");
    ctx.fillStyle = grad;
    roundRect(ctx, 10, 15, 108, 150, 4);
    ctx.fill();

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    roundRect(ctx, 10, 15, 108, 150, 4);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = "#1e3a5f";
        ctx.beginPath();
        ctx.arc(30 + j * 35, 35 + i * 35, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group position={position} rotation={rotation as any} scale={scale}>
      <mesh onClick={onClick} castShadow>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshStandardMaterial
          map={faceUp ? texture : backTexture}
          roughness={0.4}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
