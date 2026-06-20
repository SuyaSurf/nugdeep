// web/lib/juice/spatial-audio.ts
"use client";

import { useRef, useCallback } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { audioManager } from "./audio-manager";

interface SpatialSource {
  panner: PannerNode;
  oscillator: OscillatorNode;
  gain: GainNode;
}

/**
 * Hook for spatial audio in Three.js scenes.
 * Attach to any component that needs positional sound.
 *
 * Usage:
 * const { playAtPosition, updateListener } = useSpatialAudio();
 * playAtPosition(new THREE.Vector3(1, 2, 3), 220, "sine", 0.05);
 * // updates automatically each frame
 */
export function useSpatialAudio() {
  const sources = useRef<Map<string, SpatialSource>>(new Map());
  const listenerPos = useRef(new THREE.Vector3(0, 0, 0));

  const playAtPosition = useCallback((
    position: THREE.Vector3,
    frequency: number,
    type: OscillatorType = "sine",
    volume = 0.03,
    id = `spatial-${Date.now()}`,
  ) => {
    const ctx = audioManager.getContext();
    const bus = audioManager.getBus("ambient");
    if (!ctx || !bus) return;

    const existing = sources.current.get(id);
    if (existing) {
      try { existing.oscillator.stop(); } catch {}
      sources.current.delete(id);
    }

    const panner = audioManager.createPanner();
    if (!panner) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);

    oscillator.connect(gain);
    gain.connect(panner);
    panner.connect(bus);

    panner.positionX.setValueAtTime(position.x, ctx.currentTime);
    panner.positionY.setValueAtTime(position.y, ctx.currentTime);
    panner.positionZ.setValueAtTime(position.z, ctx.currentTime);

    oscillator.start();

    sources.current.set(id, { panner, oscillator, gain });

    return id;
  }, []);

  const stopSource = useCallback((id: string) => {
    const source = sources.current.get(id);
    if (source) {
      try { source.oscillator.stop(); } catch {}
      sources.current.delete(id);
    }
  }, []);

  const stopAll = useCallback(() => {
    sources.current.forEach((source) => {
      try { source.oscillator.stop(); } catch {}
    });
    sources.current.clear();
  }, []);

  useFrame(({ camera }) => {
    const ctx = audioManager.getContext();
    if (!ctx) return;

    const pos = camera.position;
    ctx.listener.positionX.setValueAtTime(pos.x, ctx.currentTime);
    ctx.listener.positionY.setValueAtTime(pos.y, ctx.currentTime);
    ctx.listener.positionZ.setValueAtTime(pos.z, ctx.currentTime);

    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    ctx.listener.forwardX.setValueAtTime(dir.x, ctx.currentTime);
    ctx.listener.forwardY.setValueAtTime(dir.y, ctx.currentTime);
    ctx.listener.forwardZ.setValueAtTime(dir.z, ctx.currentTime);
  });

  return { playAtPosition, stopSource, stopAll };
}
