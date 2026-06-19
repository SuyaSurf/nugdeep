"use client";

export type AICharacterMood = "idle" | "selected" | "thinking" | "win" | "lose";

export type AIReaction = {
  sound: "fanfare" | "sigh" | "buzz" | "bell";
  text: string;
};

export interface AICharacter {
  id: string;
  name: string;
  level: number;
  tagline: string;
  accent: string;
  mood: AICharacterMood;
  assetId: string;
  voiceCue: string;
  reactionMap: Record<Exclude<AICharacterMood, "idle">, AIReaction>;
}

const CHARACTERS: AICharacter[] = [
  {
    id: "dianey", name: "Dianey", level: 1, tagline: "Plays by impulse. Chaotic and slow.", accent: "#ff6f61",
    mood: "idle", assetId: "mascot-dianey", voiceCue: "playful",
    reactionMap: {
      selected: { sound: "bell", text: "Oh! Me? Okay, let's go!" },
      thinking: { sound: "bell", text: "Hmm, what was that move?" },
      win: { sound: "fanfare", text: "Did I just win? I totally meant to do that!" },
      lose: { sound: "buzz", text: "No fair! I was just warming up." },
    },
  },
  {
    id: "crow", name: "Crow", level: 2, tagline: "Solid instincts. Reads the basics.", accent: "#b8ff72",
    mood: "idle", assetId: "mascot-crow", voiceCue: "calm",
    reactionMap: {
      selected: { sound: "bell", text: "Crow, reporting." },
      thinking: { sound: "bell", text: "Let me think about this." },
      win: { sound: "fanfare", text: "Solid win. Good game." },
      lose: { sound: "sigh", text: "Well played. I'll adapt." },
    },
  },
  {
    id: "ralph", name: "Ralph", level: 3, tagline: "Reads signals. Deceptive play.", accent: "#68a8ff",
    mood: "idle", assetId: "mascot-ralph", voiceCue: "smug",
    reactionMap: {
      selected: { sound: "bell", text: "You sure about this?" },
      thinking: { sound: "bell", text: "Interesting pattern..." },
      win: { sound: "fanfare", text: "Expected. You were readable." },
      lose: { sound: "sigh", text: "Lucky reads. Won't happen twice." },
    },
  },
  {
    id: "mira", name: "Mira", level: 4, tagline: "Patterns are chess to her.", accent: "#9b7bff",
    mood: "idle", assetId: "mascot-mira", voiceCue: "analytical",
    reactionMap: {
      selected: { sound: "bell", text: "Initiated. Let's see your range." },
      thinking: { sound: "bell", text: "Cross-referencing patterns." },
      win: { sound: "fanfare", text: "Predictable distribution. Solved." },
      lose: { sound: "sigh", text: "Interesting deviation. I'll log that." },
    },
  },
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
