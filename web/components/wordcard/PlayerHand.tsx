"use client";

import { useMemo } from "react";
import Card3D from "./Card3D";

interface HandCard {
  id: string;
  word: string;
}

interface PlayerHandProps {
  cards: HandCard[];
  faceUp: boolean;
  position: [number, number, number];
  isActive: boolean;
  onCardClick?: (cardId: string) => void;
  selectedCardId?: string | null;
}

export default function PlayerHand({
  cards,
  faceUp,
  position,
  isActive,
  onCardClick,
  selectedCardId,
}: PlayerHandProps) {
  const layout = useMemo(() => {
    const count = cards.length;
    const maxSpread = Math.min(count * 0.35, 3.5);
    const spread = Math.max(maxSpread, 1);
    const rot = faceUp ? -0.15 : 0.15;

    return cards.map((card, i) => {
      const t = count <= 1 ? 0 : (i / (count - 1)) * 2 - 1;
      const x = t * spread * 0.5;
      const z = faceUp ? -Math.abs(t) * 0.3 : Math.abs(t) * 0.3;
      const rotation = faceUp ? 0 : Math.PI;
      const angle = t * 0.15;
      const isSelected = card.id === selectedCardId;
      const yOffset = isSelected ? 0.3 : 0;
      const scale = isSelected ? 1.15 : 1;

      return { card, x, z, angle, rotation, isSelected, yOffset, scale };
    });
  }, [cards, faceUp, selectedCardId]);

  return (
    <group position={position}>
      {layout.map(({ card, x, z, angle, rotation, yOffset, scale }) => (
        <Card3D
          key={card.id}
          word={card.word}
          faceUp={faceUp}
          position={[x, yOffset, z]}
          rotation={[angle, rotation, 0]}
          onClick={() => onCardClick?.(card.id)}
          scale={scale}
          highlight={isActive && faceUp}
        />
      ))}
    </group>
  );
}
