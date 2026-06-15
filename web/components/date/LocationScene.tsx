"use client";

import { useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LocationDef } from "@/lib/locations";

interface LocationSceneProps {
  location: LocationDef;
}

export default function LocationScene({ location }: LocationSceneProps) {
  switch (location.scenePreset) {
    case "observatory":
      return <ObservatoryScene />;
    case "garden":
      return <GardenScene />;
    case "rooftop":
      return <RooftopScene />;
    default:
      return null;
  }
}

function SceneFog({ color, density }: { color: string; density: number }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2(color, density);
    return () => { scene.fog = null; };
  }, [color, density]);
  return null;
}

function ObservatoryScene() {
  const particles = useMemo(() => {
    const pos = new Float32Array(900);
    for (let i = 0; i < 900; i += 3) {
      pos[i] = (Math.random() - 0.5) * 30;
      pos[i + 1] = Math.random() * 12;
      pos[i + 2] = (Math.random() - 0.5) * 30 - 5;
    }
    return pos;
  }, []);

  return (
    <>
      <color attach="background" args={["#0a0a1a"]} />
      <ambientLight intensity={0.15} color="#6366f1" />
      <pointLight position={[0, 6, 0]} intensity={0.08} color="#dc8b6b" />
      <SceneFog color="#0a0a1a" density={0.008} />

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={300}
            array={particles}
            itemSize={3}
            args={[particles, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#f5f2e9"
          size={0.06}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <ringGeometry args={[0.5, 2.5, 48]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

function GardenScene() {
  return (
    <>
      <color attach="background" args={["#041a24"]} />
      <ambientLight intensity={0.2} color="#3a9d88" />
      <pointLight position={[0, 2, 0]} intensity={0.15} color="#3a9d88" />
      <SceneFog color="#041a24" density={0.012} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial
          color="#082f49"
          roughness={0.3}
          metalness={0.6}
          transparent
          opacity={0.7}
        />
      </mesh>
    </>
  );
}

function RooftopScene() {
  return (
    <>
      <color attach="background" args={["#0d0515"]} />
      <ambientLight intensity={0.1} color="#d34d7b" />
      <pointLight position={[2, 3, -1]} intensity={0.2} color="#d34d7b" />
      <pointLight position={[-2, 2, 1]} intensity={0.1} color="#6366f1" />
      <SceneFog color="#0d0515" density={0.015} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#1a0a20" roughness={0.9} metalness={0.1} />
      </mesh>
    </>
  );
}
