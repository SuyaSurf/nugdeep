"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface ApproachCameraProps {
  approach: boolean;
  onApproachComplete?: () => void;
}

export default function ApproachCamera({ approach, onApproachComplete }: ApproachCameraProps) {
  const { camera } = useThree();
  const progress = useRef(0);
  const hasTriggered = useRef(false);

  const startPos = new THREE.Vector3(0, 0.8, 8);
  const endPos = new THREE.Vector3(0, 1.2, 2.5);
  const startLook = new THREE.Vector3(0, 1.2, 0);
  const endLook = new THREE.Vector3(0, 1.8, 0);

  useFrame((_, delta) => {
    if (!approach) {
      camera.position.lerp(startPos, 0.04);
      camera.lookAt(startLook);
      return;
    }

    progress.current = Math.min(1, progress.current + delta * 0.6);
    const t = easeInOutCubic(progress.current);

    camera.position.lerpVectors(startPos, endPos, t);
    camera.lookAt(new THREE.Vector3(0, 1.2 + t * 0.6, 0));

    if (progress.current >= 1 && !hasTriggered.current) {
      hasTriggered.current = true;
      onApproachComplete?.();
    }
  });

  useEffect(() => {
    camera.position.copy(startPos);
    camera.lookAt(startLook);
  }, []);

  return null;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
