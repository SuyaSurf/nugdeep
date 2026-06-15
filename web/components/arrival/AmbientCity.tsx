"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function AmbientCity() {
  const fogRef = useRef<THREE.Group>(null);
  const gridRef = useRef<THREE.GridHelper>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(600);
    for (let i = 0; i < 600; i += 3) {
      positions[i] = (Math.random() - 0.5) * 40;
      positions[i + 1] = Math.random() * 4;
      positions[i + 2] = (Math.random() - 0.5) * 40 - 5;
    }
    return positions;
  }, []);

  useEffect(() => {
    if (gridRef.current) {
      const material = gridRef.current.material as THREE.Material;
      material.transparent = true;
      material.opacity = 0.15;
    }
  }, []);

  useFrame(({ clock }) => {
    if (fogRef.current) {
      fogRef.current.position.x = Math.sin(clock.elapsedTime * 0.02) * 2;
    }
  });

  return (
    <>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#050508" roughness={1} metalness={0} />
      </mesh>

      {/* Ground grid */}
      <gridHelper ref={gridRef} args={[20, 20, "#1a1a2e", "#1a1a2e"]} position={[0, -0.05, 0]} />

      {/* Fog particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={200}
            array={particles}
            itemSize={3}
            args={[particles, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#8e9dff"
          size={0.08}
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}
