"use client";

import type { GameCategory } from "@/lib/juice/audio-engine";
import type { ColorPalette } from "@/lib/juice/color-palette";
import { getGamePalette } from "@/lib/juice/color-palette";

export interface GameProfile {
  id: string;
  name: string;
  description: string;
  category: GameCategory;
  roundTime: number;   // seconds per round
  maxRounds: number;   // rounds per match
  matchTime: number;   // estimated total match time (seconds)
  players: number;
  colors: ColorPalette;
  shareHook: string;
  status: "ready" | "coming_soon";
}

const GAMES: GameProfile[] = [
  // ─── Nerve ──────────────────────────────────────────────
  {
    id: "the_button", name: "The Button",
    description: "Press stop as close to 10s as possible without going over",
    category: "nerve", roundTime: 12, maxRounds: 1, matchTime: 20, players: 2,
    colors: getGamePalette("the_button"),
    shareHook: "I hit 9.97s — can you beat it?", status: "ready",
  },
  {
    id: "chicken", name: "Chicken",
    description: "Hold the bar. First to release loses. Pure nerve.",
    category: "nerve", roundTime: 20, maxRounds: 3, matchTime: 60, players: 2,
    colors: getGamePalette("chicken"),
    shareHook: "I held to 97% before flinching", status: "ready",
  },
  {
    id: "roulette", name: "Roulette",
    description: "6 chambers, 1 bullet. Fire or pass?",
    category: "nerve", roundTime: 30, maxRounds: 1, matchTime: 40, players: 2,
    colors: getGamePalette("roulette"),
    shareHook: "I fired on chamber 5 and LIVED", status: "coming_soon",
  },
  {
    id: "flip", name: "Flip",
    description: "Flip cards higher than the last. Flip the 9 and you lose instantly.",
    category: "nerve", roundTime: 30, maxRounds: 1, matchTime: 40, players: 2,
    colors: getGamePalette("flip"),
    shareHook: "I flipped the 9 on my last card", status: "coming_soon",
  },
  {
    id: "bomb", name: "Bomb",
    description: "5×5 grid with one bomb. Flip safe tiles until someone finds it.",
    category: "nerve", roundTime: 45, maxRounds: 1, matchTime: 55, players: 2,
    colors: getGamePalette("bomb"),
    shareHook: "2 tiles left. Opponent flipped the bomb.", status: "coming_soon",
  },
  {
    id: "dice_fate", name: "Dice Fate",
    description: "Bet high or low. The die tumbles in slow motion.",
    category: "nerve", roundTime: 8, maxRounds: 7, matchTime: 60, players: 2,
    colors: getGamePalette("dice_fate"),
    shareHook: "I bet high. It landed on 3. So close.", status: "ready",
  },

  // ─── Reflex ─────────────────────────────────────────────
  {
    id: "quick_draw", name: "Quick Draw",
    description: "Countdown 3…2…1… DRAW! First to fire wins. Flinch and you're out.",
    category: "reflex", roundTime: 8, maxRounds: 5, matchTime: 45, players: 2,
    colors: getGamePalette("quick_draw"),
    shareHook: "I drew in 0.12s — fastest finger", status: "ready",
  },
  {
    id: "bell_ringer", name: "Bell Ringer",
    description: "Category appears. Fastest valid answer wins. Wrong answer backfires.",
    category: "reflex", roundTime: 12, maxRounds: 7, matchTime: 90, players: 2,
    colors: getGamePalette("bell_ringer"),
    shareHook: "I said 'duck' for 'something that floats'", status: "coming_soon",
  },

  // ─── Psychology ──────────────────────────────────────────
  {
    id: "simul_pick", name: "Simul-Pick",
    description: "Pick a symbol. Your opponent picks too. Reveal simultaneously.",
    category: "psychology", roundTime: 8, maxRounds: 7, matchTime: 60, players: 2,
    colors: getGamePalette("simul_pick"),
    shareHook: "I knew they'd pick rock on round 5", status: "ready",
  },
  {
    id: "compass", name: "Compass",
    description: "Pick a direction. The compass needle reveals true north.",
    category: "psychology", roundTime: 8, maxRounds: 7, matchTime: 60, players: 2,
    colors: getGamePalette("compass"),
    shareHook: "The compass needle settled on N. I picked NE.", status: "coming_soon",
  },
  {
    id: "sabotage", name: "Sabotage",
    description: "Build or sabotage? Destroy the tower to win.",
    category: "psychology", roundTime: 8, maxRounds: 7, matchTime: 60, players: 2,
    colors: getGamePalette("sabotage"),
    shareHook: "They built. I sabotaged. CRASH.", status: "coming_soon",
  },
  {
    id: "the_offering", name: "The Offering",
    description: "Offer a token to the shrine. Match the request to win.",
    category: "psychology", roundTime: 12, maxRounds: 5, matchTime: 70, players: 2,
    colors: getGamePalette("the_offering"),
    shareHook: "We both offered the red token. The shrine rejected us both.", status: "coming_soon",
  },

  // ─── Social / Creative ──────────────────────────────────
  {
    id: "which_one", name: "Which One",
    description: "This or that. Match your opponent's pick for points.",
    category: "social", roundTime: 6, maxRounds: 7, matchTime: 50, players: 2,
    colors: getGamePalette("which_one"),
    shareHook: "We matched on 6/7. Soulmates?", status: "ready",
  },
  {
    id: "story_dice", name: "Story Dice",
    description: "3 icons, 30 seconds, one sentence. Read each other's stories.",
    category: "social", roundTime: 40, maxRounds: 3, matchTime: 130, players: 2,
    colors: getGamePalette("story_dice"),
    shareHook: "She wrote that in 30 seconds. I can't even.", status: "coming_soon",
  },
  {
    id: "gesture", name: "Gesture",
    description: "Draw a prompt in 15 seconds. Both drawings revealed together.",
    category: "social", roundTime: 25, maxRounds: 3, matchTime: 85, players: 2,
    colors: getGamePalette("gesture"),
    shareHook: "I tried to draw a star. I drew a potato.", status: "coming_soon",
  },
  {
    id: "bouquet", name: "Bouquet",
    description: "Pick 3 flowers. Your bouquet is scored on harmony.",
    category: "social", roundTime: 20, maxRounds: 3, matchTime: 70, players: 2,
    colors: getGamePalette("bouquet"),
    shareHook: "We both picked the rose. Great minds.", status: "coming_soon",
  },
  {
    id: "palette", name: "Palette",
    description: "Memorize a color. Tap where it was on the gradient.",
    category: "social", roundTime: 10, maxRounds: 5, matchTime: 60, players: 2,
    colors: getGamePalette("palette"),
    shareHook: "I was THIS close on the color match", status: "ready",
  },
  {
    id: "pairing", name: "Pairing",
    description: "Memory match. Find a pair, answer a question about yourself.",
    category: "social", roundTime: 60, maxRounds: 1, matchTime: 70, players: 2,
    colors: getGamePalette("pairing"),
    shareHook: "We found 3 pairs + I know their dream vacation", status: "coming_soon",
  },

  // ─── Strategy ────────────────────────────────────────────
  {
    id: "scales", name: "Scales",
    description: "Choose a weight. Heavier wins. But too heavy breaks the scale.",
    category: "strategy", roundTime: 8, maxRounds: 5, matchTime: 50, players: 2,
    colors: getGamePalette("scales"),
    shareHook: "I picked 7. They picked 6. The scale held.", status: "coming_soon",
  },
  {
    id: "plank", name: "Plank",
    description: "Walk toward each other on a plank. Don't fall.",
    category: "strategy", roundTime: 40, maxRounds: 1, matchTime: 50, players: 2,
    colors: getGamePalette("plank"),
    shareHook: "One step from the edge. I advanced. They fell.", status: "coming_soon",
  },
  {
    id: "sumo", name: "Sumo",
    description: "Push your opponent out of the ring. The ring shrinks.",
    category: "strategy", roundTime: 30, maxRounds: 3, matchTime: 100, players: 2,
    colors: getGamePalette("sumo"),
    shareHook: "I was almost out. One last push won it.", status: "coming_soon",
  },
  {
    id: "boil", name: "Boil",
    description: "Add ingredients to a pot. Don't let it boil over.",
    category: "strategy", roundTime: 40, maxRounds: 1, matchTime: 50, players: 2,
    colors: getGamePalette("boil"),
    shareHook: "I added chili. The pot boiled over. RIP.", status: "coming_soon",
  },
  {
    id: "kite_fight", name: "Kite Fight",
    description: "Fly your kite. Cut the opponent's string to win.",
    category: "strategy", roundTime: 30, maxRounds: 3, matchTime: 100, players: 2,
    colors: getGamePalette("kite_fight"),
    shareHook: "My kite fell in slow motion. Beautiful even in defeat.", status: "coming_soon",
  },

  // ─── Knowledge ───────────────────────────────────────────
  {
    id: "food_remedy", name: "Food Remedy",
    description: "5s to pick the best natural remedy for a health condition.",
    category: "knowledge", roundTime: 8, maxRounds: 7, matchTime: 70, players: 2,
    colors: getGamePalette("food_remedy"),
    shareHook: "Beetroot lowers BP in 2 hours. I got 7/7.", status: "ready",
  },
  {
    id: "style_match", name: "Style Match",
    description: "Pick the right outfit for the occasion. 5 seconds.",
    category: "knowledge", roundTime: 8, maxRounds: 7, matchTime: 70, players: 2,
    colors: getGamePalette("style_match"),
    shareHook: "Wedge sandals for beach wedding. Obviously.", status: "coming_soon",
  },
  {
    id: "kitchen_math", name: "Kitchen Math",
    description: "Scale recipes under time pressure. 5 seconds per question.",
    category: "knowledge", roundTime: 8, maxRounds: 7, matchTime: 70, players: 2,
    colors: getGamePalette("kitchen_math"),
    shareHook: "100% on Kitchen Math and I've never cooked", status: "coming_soon",
  },
  {
    id: "ingredient_swap", name: "Ingredient Swap",
    description: "Out of an ingredient? Pick a substitute. Some are trick questions.",
    category: "knowledge", roundTime: 8, maxRounds: 7, matchTime: 70, players: 2,
    colors: getGamePalette("ingredient_swap"),
    shareHook: "ALL FOUR work as buttermilk substitutes", status: "coming_soon",
  },
  {
    id: "chess_5", name: "5-Move Chess",
    description: "Same position. 5 moves each. Engine scores. Highest wins.",
    category: "knowledge", roundTime: 90, maxRounds: 1, matchTime: 100, players: 2,
    colors: getGamePalette("chess_5"),
    shareHook: "I was winning until move 4. One bad move.", status: "coming_soon",
  },

  // ─── Visual ──────────────────────────────────────────────
  {
    id: "spot_difference", name: "Spot the Difference",
    description: "Two images. Tap the difference first.",
    category: "visual", roundTime: 20, maxRounds: 5, matchTime: 110, players: 2,
    colors: getGamePalette("spot_difference"),
    shareHook: "I spotted it in 2 seconds. They're still looking.", status: "coming_soon",
  },
  {
    id: "war_ante", name: "War (Ante)",
    description: "Flip cards. Bet big. Win big.",
    category: "visual", roundTime: 30, maxRounds: 1, matchTime: 40, players: 2,
    colors: getGamePalette("war_ante"),
    shareHook: "I bet 3 with a 2 showing. Pulled a king.", status: "coming_soon",
  },
];

export function getAllGames(): GameProfile[] {
  return GAMES;
}

export function getGame(id: string): GameProfile | undefined {
  return GAMES.find((g) => g.id === id);
}

export function getGamesByCategory(category: GameCategory): GameProfile[] {
  return GAMES.filter((g) => g.category === category);
}

export function getReadyGames(): GameProfile[] {
  return GAMES.filter((g) => g.status === "ready");
}
