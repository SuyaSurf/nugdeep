"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COLORS = ["#8e9dff", "#b8ff72", "#ff9368"];

export default function PresenceSignals3D() {
  const groupRef = useRef<THREE.Group>(null);
  const offsets = useMemo(
    () =>
      Array.from({ length: 7 }, () => ({
        x: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 6 + 2,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const children = groupRef.current.children;
    offsets.forEach((o, i) => {
      if (i >= children.length) return;
      const mesh = children[i] as THREE.Mesh;
      const t = clock.elapsedTime * o.speed + o.phase;
      mesh.position.y = 0.5 + 0.3 * Math.sin(t);
      mesh.position.x = o.x + 0.4 * Math.sin(t * 0.7);
      mesh.position.z = o.z + 0.4 * Math.cos(t * 0.5);
    });
  });

  return (
    <group ref={groupRef}>
      {offsets.map((o, i) => (
        <mesh key={i} position={[o.x, 0.5, o.z]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={o.color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}
