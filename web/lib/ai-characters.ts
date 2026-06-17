"use client";

export interface AICharacter {
  id: string;
  name: string;
  level: number;
  tagline: string;
  accent: string;
}

const CHARACTERS: AICharacter[] = [
  { id: "dianey", name: "Dianey", level: 1, tagline: "Plays by impulse. Chaotic and slow.", accent: "#ff6f61" },
  { id: "crow", name: "Crow", level: 2, tagline: "Solid instincts. Reads the basics.", accent: "#b8ff72" },
  { id: "ralph", name: "Ralph", level: 3, tagline: "Reads signals. Deceptive play.", accent: "#68a8ff" },
  { id: "mira", name: "Mira", level: 4, tagline: "Patterns are chess to her.", accent: "#9b7bff" },
];

function hashInt(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getAICharacters(): AICharacter[] {
  return CHARACTERS;
}

export function pickAICharacters(count: number, seed?: string): AICharacter[] {
  const shuffled = [...CHARACTERS].sort((a, b) => {
    const keyA = seed ? hashInt(`${seed}:${a.id}`) : a.level;
    const keyB = seed ? hashInt(`${seed}:${b.id}`) : b.level;
    return keyA - keyB;
  });
  return shuffled.slice(0, Math.min(count, CHARACTERS.length));
}

export function getAICharacter(id: string): AICharacter | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
