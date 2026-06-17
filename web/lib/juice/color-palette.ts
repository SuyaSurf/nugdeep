"use client";

// Every game gets a unique 2-color identity.
// `primary` = main game color, `accent` = secondary / highlight.
// `bg` = background gradient, `success/failure/gold` = universal feedback.

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  success: string;
  failure: string;
  gold: string;
}

// ─── Nerve ──────────────────────────────────────────────────

export const theButton: ColorPalette = {
  primary: "#06b6d4",   // cyan
  secondary: "#0891b2",
  accent: "#22d3ee",
  bg: "#0f172a",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const chicken: ColorPalette = {
  primary: "#f43f5e",   // rose
  secondary: "#e11d48",
  accent: "#fb7185",
  bg: "#1c1917",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const roulette: ColorPalette = {
  primary: "#991b1b",   // dark red
  secondary: "#7f1d1d",
  accent: "#dc2626",
  bg: "#0a0a0a",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#fbbf24",
};

export const flip: ColorPalette = {
  primary: "#d97706",   // amber
  secondary: "#b45309",
  accent: "#f59e0b",
  bg: "#1c1917",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#fbbf24",
};

export const bomb: ColorPalette = {
  primary: "#dc2626",   // red
  secondary: "#b91c1c",
  accent: "#f87171",
  bg: "#0f0f0f",
  success: "#34d399",
  failure: "#dc2626",
  gold: "#fbbf24",
};

export const diceFate: ColorPalette = {
  primary: "#8b5cf6",   // purple
  secondary: "#7c3aed",
  accent: "#a78bfa",
  bg: "#0f0f0f",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

// ─── Reflex ─────────────────────────────────────────────────

export const quickDraw: ColorPalette = {
  primary: "#dc2626",   // red (western)
  secondary: "#b91c1c",
  accent: "#fbbf24",
  bg: "#1a0a0a",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const bellRinger: ColorPalette = {
  primary: "#d97706",   // golden bell
  secondary: "#92400e",
  accent: "#fbbf24",
  bg: "#1a1625",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

// ─── Psychology ─────────────────────────────────────────────

export const simulPick: ColorPalette = {
  primary: "#6366f1",   // indigo
  secondary: "#4f46e5",
  accent: "#818cf8",
  bg: "#0f0d1a",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const compass: ColorPalette = {
  primary: "#b45309",   // brass
  secondary: "#92400e",
  accent: "#d97706",
  bg: "#0a0a0f",
  success: "#34d399",
  failure: "#ef4444",
  gold: "#fbbf24",
};

export const sabotage: ColorPalette = {
  primary: "#78716c",   // stone
  secondary: "#57534e",
  accent: "#a8a29e",
  bg: "#1c1917",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const theOffering: ColorPalette = {
  primary: "#7c3aed",   // royal purple
  secondary: "#5b21b6",
  accent: "#a78bfa",
  bg: "#0f0a1a",
  success: "#34d399",
  failure: "#ef4444",
  gold: "#fbbf24",
};

// ─── Social / Creative ──────────────────────────────────────

export const whichOne: ColorPalette = {
  primary: "#f59e0b",   // warm gold
  secondary: "#d97706",
  accent: "#fbbf24",
  bg: "#1c1822",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const storyDice: ColorPalette = {
  primary: "#ec4899",   // pink
  secondary: "#db2777",
  accent: "#f472b6",
  bg: "#1c1822",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const gesture: ColorPalette = {
  primary: "#ffffff",   // white canvas
  secondary: "#e5e7eb",
  accent: "#f59e0b",
  bg: "#1f1f1f",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#fbbf24",
};

export const bouquet: ColorPalette = {
  primary: "#f472b6",   // pink blush
  secondary: "#ec4899",
  accent: "#fb7185",
  bg: "#1a1420",
  success: "#34d399",
  failure: "#ef4444",
  gold: "#fbbf24",
};

export const palette: ColorPalette = {
  primary: "#22d3ee",   // cyan
  secondary: "#06b6d4",
  accent: "#67e8f9",
  bg: "#0f172a",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const pairing: ColorPalette = {
  primary: "#a78bfa",   // soft purple
  secondary: "#8b5cf6",
  accent: "#c4b5fd",
  bg: "#1a1425",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

// ─── Strategy ───────────────────────────────────────────────

export const scales: ColorPalette = {
  primary: "#d97706",   // brass
  secondary: "#92400e",
  accent: "#fbbf24",
  bg: "#0f0a05",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const plank: ColorPalette = {
  primary: "#78716c",   // wood
  secondary: "#57534e",
  accent: "#d6d3d1",
  bg: "#0a0a12",
  success: "#34d399",
  failure: "#ef4444",
  gold: "#fbbf24",
};

export const sumo: ColorPalette = {
  primary: "#dc2626",   // red dohyo
  secondary: "#1d4ed8", // blue mawashi
  accent: "#fbbf24",
  bg: "#0f0f0f",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const boil: ColorPalette = {
  primary: "#ea580c",   // fire orange
  secondary: "#c2410c",
  accent: "#f97316",
  bg: "#0f0805",
  success: "#34d399",
  failure: "#ef4444",
  gold: "#fbbf24",
};

export const kiteFight: ColorPalette = {
  primary: "#f97316",   // sunset orange
  secondary: "#6366f1", // sky indigo
  accent: "#fbbf24",
  bg: "#0a0f1a",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

// ─── Knowledge ──────────────────────────────────────────────

export const foodRemedy: ColorPalette = {
  primary: "#65a30d",   // herb green
  secondary: "#4d7c0f",
  accent: "#a3e635",
  bg: "#0f1208",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const styleMatch: ColorPalette = {
  primary: "#ec4899",   // blush
  secondary: "#d946ef",
  accent: "#f472b6",
  bg: "#1a0f1a",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const kitchenMath: ColorPalette = {
  primary: "#f97316",   // warm orange
  secondary: "#ea580c",
  accent: "#fdba74",
  bg: "#14100a",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const ingredientSwap: ColorPalette = {
  primary: "#84cc16",   // lime
  secondary: "#65a30d",
  accent: "#bef264",
  bg: "#0f0f08",
  success: "#34d399",
  failure: "#ef4444",
  gold: "#fbbf24",
};

export const chess5: ColorPalette = {
  primary: "#d6d3d1",   // ivory
  secondary: "#57534e",
  accent: "#fbbf24",
  bg: "#0f0d0a",
  success: "#34d399",
  failure: "#ef4444",
  gold: "#f59e0b",
};

// ─── Visual ─────────────────────────────────────────────────

export const spotDifference: ColorPalette = {
  primary: "#22d3ee",   // cyan
  secondary: "#06b6d4",
  accent: "#67e8f9",
  bg: "#0f172a",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

export const warAnte: ColorPalette = {
  primary: "#15803d",   // felt green
  secondary: "#166534",
  accent: "#fbbf24",
  bg: "#0a0a0a",
  success: "#10b981",
  failure: "#ef4444",
  gold: "#f59e0b",
};

// ─── Registry ───────────────────────────────────────────────

export const gamePalettes: Record<string, ColorPalette> = {
  the_button: theButton,
  chicken,
  roulette,
  flip,
  bomb,
  dice_fate: diceFate,
  quick_draw: quickDraw,
  bell_ringer: bellRinger,
  simul_pick: simulPick,
  compass,
  sabotage,
  the_offering: theOffering,
  which_one: whichOne,
  story_dice: storyDice,
  gesture,
  bouquet,
  palette,
  pairing,
  scales,
  plank,
  sumo,
  boil,
  kite_fight: kiteFight,
  food_remedy: foodRemedy,
  style_match: styleMatch,
  kitchen_math: kitchenMath,
  ingredient_swap: ingredientSwap,
  chess_5: chess5,
  spot_difference: spotDifference,
  war_ante: warAnte,
};

export function getGamePalette(gameId: string): ColorPalette {
  return gamePalettes[gameId] ?? whichOne;
}
