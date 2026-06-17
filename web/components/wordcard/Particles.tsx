"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 60;
const BURST_COUNT = 30;

export function AmbientParticles() {
  const meshRef = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);
    const offsets = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = Math.random() * 3 + 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      sizes[i] = 0.015 + Math.random() * 0.025;
      speeds[i] = 0.1 + Math.random() * 0.2;
      offsets[i] = Math.random() * Math.PI * 2;
    }
    return { positions, sizes, speeds, offsets };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const pos = meshRef.current.geometry.attributes.position;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos.array[i * 3] += Math.sin(t * data.speeds[i] + data.offsets[i]) * 0.002;
      pos.array[i * 3 + 1] += Math.sin(t * data.speeds[i] * 0.5 + data.offsets[i]) * 0.001;
      pos.array[i * 3 + 2] += Math.cos(t * data.speeds[i] + data.offsets[i]) * 0.002;
    }
    pos.needsUpdate = true;
  });

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    return g;
  }, [data]);

  return (
    <points ref={meshRef} geometry={geo}>
      <pointsMaterial
        size={0.02}
        color="#10b981"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function ScoreBurst({ position = [0, 0.5, 0] }: { position?: [number, number, number] }) {
  const meshRef = useRef<THREE.Points>(null);
  const velocities = useRef<THREE.Vector3[]>([]);
  const life = useRef(1);

  const geo = useMemo(() => {
    const positions = new Float32Array(BURST_COUNT * 3);
    const colors = new Float32Array(BURST_COUNT * 3);
    for (let i = 0; i < BURST_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      const c = new THREE.Color().setHSL(0.35 + Math.random() * 0.15, 0.8, 0.5 + Math.random() * 0.3);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      velocities.current.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 3
        )
      );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    life.current -= delta * 1.5;
    if (life.current <= 0) {
      meshRef.current.visible = false;
      return;
    }
    const pos = meshRef.current.geometry.attributes.position;
    for (let i = 0; i < BURST_COUNT; i++) {
      pos.array[i * 3] += velocities.current[i].x * delta;
      pos.array[i * 3 + 1] += velocities.current[i].y * delta - 2 * delta;
      pos.array[i * 3 + 2] += velocities.current[i].z * delta;
    }
    pos.needsUpdate = true;
    (meshRef.current.material as THREE.PointsMaterial).opacity = life.current;
  });

  return (
    <points ref={meshRef} position={position} geometry={geo}>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={1}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
