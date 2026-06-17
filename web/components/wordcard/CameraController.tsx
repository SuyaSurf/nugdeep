"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface CameraControllerProps {
  target?: [number, number, number];
  zoom?: boolean;
  duration?: number;
}

export default function CameraController({
  target = [0, 0.2, 0],
  zoom = false,
  duration = 0.8,
}: CameraControllerProps) {
  const { camera } = useThree();
  const state = useRef({
    startPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    progress: 1,
    isAnimating: false,
    currentZoom: false,
  });

  if (zoom !== state.current.currentZoom) {
    state.current.currentZoom = zoom;
    state.current.startPos.copy(camera.position);
    state.current.startTarget.set(...target);
    state.current.progress = 0;
    state.current.isAnimating = true;

    if (zoom) {
      state.current.endPos.set(target[0], target[1] + 0.8, target[2] + 2);
    } else {
      state.current.endPos.set(0, 2.5, 4.5);
    }
  }

  const defaultPos = new THREE.Vector3(0, 2.5, 4.5);
  const lookAt = new THREE.Vector3(0, 0.2, 0);

  useFrame((_, delta) => {
    if (state.current.isAnimating) {
      state.current.progress += delta / duration;
      if (state.current.progress >= 1) {
        state.current.progress = 1;
        state.current.isAnimating = false;
      }
      const t = easeInOutCubic(state.current.progress);
      camera.position.lerpVectors(
        state.current.startPos,
        state.current.endPos,
        t
      );
      const targetVec = new THREE.Vector3().lerpVectors(
        state.current.startTarget,
        new THREE.Vector3(...target),
        t
      );
      camera.lookAt(targetVec);
    } else {
      camera.position.lerp(defaultPos, 0.05);
      camera.lookAt(lookAt);
    }
  });

  return null;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
