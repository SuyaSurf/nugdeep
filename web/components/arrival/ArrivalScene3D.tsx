"use client";

import { useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";

const Building3D = dynamic(() => import("./Building3D"), { ssr: false });
const ApproachCamera = dynamic(() => import("./ApproachCamera"), { ssr: false });
const AmbientCity = dynamic(() => import("./AmbientCity"), { ssr: false });
const PresenceSignals3D = dynamic(() => import("./PresenceSignals3D"), { ssr: false });

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAudioStore } from "@/lib/stores/audio-store";
import {
  enableExperienceAudio,
  playExperienceEnter,
  pulseHaptic,
} from "@/components/experience/experience-audio";

export default function ArrivalScene3D() {
  const [approaching, setApproaching] = useState(false);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 });
  const { isEnabled, setEnabled } = useAudioStore();
  const router = useRouter();

  const handleEnter = useCallback(async () => {
    if (!isEnabled) {
      const ok = await enableExperienceAudio();
      setEnabled(ok);
    }
    playExperienceEnter();
    pulseHaptic("enter");
    setApproaching(true);
  }, [isEnabled, setEnabled]);

  const handleApproachComplete = useCallback(() => {
    router.push("/lobby");
  }, [router]);

  return (
    <main
      className="experience-shell"
      aria-label="Approach the Bammby game center"
      onPointerMove={(e) =>
        setPointer({
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
        })
      }
    >
      <div
        className="experience-world"
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        <Canvas
          shadows
          camera={{ position: [0, 0.8, 8], fov: 45 }}
          gl={{
            antialias: true,
            alpha: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor(new THREE.Color("#080812"));
            scene.fog = new THREE.FogExp2("#080812", 0.025);
          }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.2} color="#8e9dff" />
            <directionalLight
              position={[5, 10, 4]}
              intensity={0.3}
              color="#fff8e7"
            />
            <pointLight
              position={[0, 0.5, 3]}
              intensity={0.08}
              color="#ff9368"
            />

            <Building3D pointerX={pointer.x} pointerY={pointer.y} />
            <AmbientCity />
            <PresenceSignals3D />
            <ApproachCamera
              approach={approaching}
              onApproachComplete={handleApproachComplete}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Overlay UI */}
      <div
        className="experience-content"
        style={{
          position: "relative",
          zIndex: 5,
          pointerEvents: approaching ? "none" : "auto",
        }}
      >
        <section className="arrival">
          <div className="arrival__status">
            <span className="arrival__status-light" />
            <span>The night lobby is open</span>
          </div>

          <div className="arrival__copy">
            <p className="arrival__eyebrow">A game center for strangers</p>
            <h1>
              Somewhere between play and possibility.
            </h1>
            <p className="arrival__lede">
              Walk in alone. Choose what you came for. Leave with a story, a
              score, or someone you did not know an hour ago.
            </p>
          </div>

          <button
            type="button"
            className="arrival__enter"
            onClick={handleEnter}
            disabled={approaching}
          >
            <span>
              <small>Tonight&apos;s entrance</small>
              Enter after dark
            </span>
            <ArrowRight aria-hidden="true" />
          </button>

          <div className="arrival__footnotes">
            <p>
              <span>One daily ritual</span>
              <span>One opponent</span>
              <span>Under three minutes</span>
            </p>
          </div>
        </section>
      </div>

    </main>
  );
}
