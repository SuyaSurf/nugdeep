"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import Table3D from "./Table3D";
import Card3D from "./Card3D";
import PlayerHand from "./PlayerHand";
import CameraController from "./CameraController";
import { AmbientParticles, ScoreBurst } from "./Particles";

interface CardData {
  id: string;
  word: string;
}

interface Scene3DProps {
  myHand: CardData[];
  opponentCount: number;
  centerCard: CardData | null;
  isMyTurn: boolean;
  onPlayCard: (cardId: string) => void;
  selectedCardId?: string | null;
  gameStatus: string;
  showBurst?: boolean;
}

export default function Scene3D({
  myHand,
  opponentCount,
  centerCard,
  isMyTurn,
  onPlayCard,
  selectedCardId,
  gameStatus,
  showBurst = false,
}: Scene3DProps) {
  const [zoomTarget, setZoomTarget] = useState<[number, number, number]>([0, 0.2, 0]);
  const [isZoomed, setIsZoomed] = useState(false);
  const prevTurn = useRef(isMyTurn);
  const burstKey = useRef(0);

  useEffect(() => {
    if (isMyTurn !== prevTurn.current) {
      prevTurn.current = isMyTurn;
      if (isMyTurn) {
        setZoomTarget([0, 0.2, -1.5]);
        setIsZoomed(true);
        setTimeout(() => setIsZoomed(false), 1200);
      } else {
        setZoomTarget([0, 0.2, 1.5]);
        setIsZoomed(true);
        setTimeout(() => setIsZoomed(false), 800);
      }
    }
  }, [isMyTurn]);

  useEffect(() => {
    if (showBurst) {
      burstKey.current++;
    }
  }, [showBurst]);

  const opponentCards = Array.from({ length: opponentCount }, (_, i) => ({
    id: `opponent-${i}`,
    word: "",
  }));

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [0, 2.5, 4.5], fov: 40 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(new THREE.Color("#0a0a1a"));
          scene.fog = new THREE.FogExp2("#0a0a1a", 0.035);
        }}
      >
        <ambientLight intensity={0.3} color="#b0c4de" />
        <directionalLight
          position={[5, 10, 4]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          color="#fff8e7"
        />
        <directionalLight
          position={[-4, 6, -3]}
          intensity={0.4}
          color="#6366f1"
        />
        <pointLight position={[0, 3, 0]} intensity={0.15} color="#10b981" />
        <pointLight position={[-2, 1.5, -2]} intensity={0.1} color="#10b981" />
        <pointLight position={[2, 1.5, 2]} intensity={0.1} color="#6366f1" />

        <Table3D />

        {centerCard && (
          <Card3D
            word={centerCard.word}
            faceUp={true}
            position={[0, 0.25, 0]}
            rotation={[0, 0, 0]}
            scale={1.4}
            highlight={false}
          />
        )}

        <PlayerHand
          cards={myHand}
          faceUp={true}
          position={[0, 0.1, -2.5]}
          isActive={isMyTurn}
          onCardClick={isMyTurn ? onPlayCard : undefined}
          selectedCardId={selectedCardId}
        />

        <PlayerHand
          cards={opponentCards}
          faceUp={false}
          position={[0, 0.1, 2.5]}
          isActive={!isMyTurn}
        />

        <CameraController target={zoomTarget} zoom={isZoomed} />

        <AmbientParticles />

        {showBurst && <ScoreBurst key={burstKey.current} position={[0, 0.5, 0]} />}

        {gameStatus === "waiting" && (
          <Card3D
            word="WAITING"
            faceUp={true}
            position={[2.5, 0.5, 0]}
            rotation={[0, -0.3, 0]}
            scale={0.8}
          />
        )}
      </Canvas>
    </div>
  );
}
