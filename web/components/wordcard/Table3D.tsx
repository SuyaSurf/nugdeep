"use client";

import { useMemo } from "react";

export default function Table3D() {
  const tableGeo = useMemo(() => {
    const geo = new Float32Array([
      -3.5, 0, -2.5,  3.5, 0, -2.5,  3.5, 0, 2.5,
      -3.5, 0, -2.5,  3.5, 0, 2.5,  -3.5, 0, 2.5,
    ]);
    return geo;
  }, []);

  return (
    <group position={[0, -0.3, 0]}>
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[7, 0.15, 5]} />
        <meshStandardMaterial color="#4a3728" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[6.2, 0.02, 4.2]} />
        <meshStandardMaterial color="#1a6b3c" roughness={0.6} />
      </mesh>
      {[-3.4, 3.4].map((x, i) => (
        <mesh key={i} position={[x, -0.18, 0]}>
          <boxGeometry args={[0.08, 0.3, 0.08]} />
          <meshStandardMaterial color="#3a2818" roughness={0.9} />
        </mesh>
      ))}
      {[-2, 2].map((z, i) => (
        <mesh key={i + 2} position={[0, -0.18, z]}>
          <boxGeometry args={[0.08, 0.3, 0.08]} />
          <meshStandardMaterial color="#3a2818" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
