"use client";

import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface Building3DProps {
  pointerX?: number;
  pointerY?: number;
}

export default function Building3D({ pointerX = 0.5, pointerY = 0.5 }: Building3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x = (pointerY - 0.5) * -0.06;
    groupRef.current.rotation.y = (pointerX - 0.5) * 0.06;
  });

  const windowPositions = useMemo(() => {
    const positions: Array<[number, number, number]> = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4; col++) {
        positions.push([-1.8 + col * 1.2, 0.3 + row * 1.1, 0.51]);
      }
    }
    return positions;
  }, []);

  const glowOffsets = useMemo(() =>
    windowPositions.map(() => Math.random() * Math.PI * 2),
  []);

  return (
    <group ref={groupRef}>
      {/* Main building body */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[5, 5.5, 3]} />
        <meshStandardMaterial color="#11111b" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Vertical facade lines */}
      {[-1.8, -0.6, 0.6, 1.8].map((x, i) => (
        <mesh key={`line-${i}`} position={[x, 1.8, 0.52]}>
          <boxGeometry args={[0.04, 5.2, 0.01]} />
          <meshBasicMaterial color="#2a2a3a" opacity={0.3} transparent />
        </mesh>
      ))}

      {/* Lit windows */}
      {windowPositions.map((pos, i) => (
        <WindowLight key={`win-${i}`} position={pos} glowOffset={glowOffsets[i]} />
      ))}

      {/* Door */}
      <mesh position={[0, 0.45, 0.52]}>
        <boxGeometry args={[0.7, 1.2, 0.02]} />
        <meshStandardMaterial color="#08080b" emissive="#ff9368" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 0.8, 0.54]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshBasicMaterial color="#ff9368" opacity={0.12} transparent />
      </mesh>

      {/* BAMMBY sign */}
      <mesh position={[0, 4.2, 0.52]}>
        <planeGeometry args={[2.8, 0.4]} />
        <meshBasicMaterial color="#f5f2e9" opacity={0.15} transparent />
      </mesh>
    </group>
  );
}

function WindowLight({ position, glowOffset }: { position: [number, number, number]; glowOffset: number }) {
  const lightRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const intensity = 0.3 + 0.15 * Math.sin(clock.elapsedTime * 0.5 + glowOffset);
    const mat = lightRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = intensity;
  });

  return (
    <mesh ref={lightRef} position={position}>
      <planeGeometry args={[0.35, 0.4]} />
      <meshBasicMaterial color="#f5f2e9" transparent opacity={0.35} />
    </mesh>
  );
}
