"use client";

export type FallbackKind = "css-mascot" | "css-ceremony" | "css-badge" | "none";

export type AssetRole =
  | "mascot"
  | "ceremony-match-found"
  | "ceremony-game-over"
  | "ceremony-score-reveal"
  | "ceremony-chat-unlocked"
  | "status-searching"
  | "status-selected";

export interface RiveAssetDescriptor {
  id: string;
  src: string;
  artboard: string;
  stateMachine: string;
  license: "free" | "remix" | "commercial";
  sourceUrl: string;
  fallbackKind: FallbackKind;
  role: AssetRole;
}

const MANIFEST: RiveAssetDescriptor[] = [
  {
    id: "mascot-dianey",
    src: "/assets/rive/mascots/dianey.riv",
    artboard: "Mascot",
    stateMachine: "StateMachine",
    license: "free",
    sourceUrl: "https://rive.app/community/",
    fallbackKind: "css-mascot",
    role: "mascot",
  },
  {
    id: "mascot-crow",
    src: "/assets/rive/mascots/crow.riv",
    artboard: "Mascot",
    stateMachine: "StateMachine",
    license: "free",
    sourceUrl: "https://rive.app/community/",
    fallbackKind: "css-mascot",
    role: "mascot",
  },
  {
    id: "mascot-ralph",
    src: "/assets/rive/mascots/ralph.riv",
    artboard: "Mascot",
    stateMachine: "StateMachine",
    license: "free",
    sourceUrl: "https://rive.app/community/",
    fallbackKind: "css-mascot",
    role: "mascot",
  },
  {
    id: "mascot-mira",
    src: "/assets/rive/mascots/mira.riv",
    artboard: "Mascot",
    stateMachine: "StateMachine",
    license: "free",
    sourceUrl: "https://rive.app/community/",
    fallbackKind: "css-mascot",
    role: "mascot",
  },
  {
    id: "ceremony-match-found",
    src: "/assets/rive/ceremonies/match-found.riv",
    artboard: "Ceremony",
    stateMachine: "StateMachine",
    license: "free",
    sourceUrl: "https://rive.app/community/",
    fallbackKind: "css-ceremony",
    role: "ceremony-match-found",
  },
  {
    id: "ceremony-game-over",
    src: "/assets/rive/ceremonies/game-over.riv",
    artboard: "Ceremony",
    stateMachine: "StateMachine",
    license: "free",
    sourceUrl: "https://rive.app/community/",
    fallbackKind: "css-ceremony",
    role: "ceremony-game-over",
  },
  {
    id: "ceremony-score-reveal",
    src: "/assets/rive/ceremonies/score-reveal.riv",
    artboard: "Ceremony",
    stateMachine: "StateMachine",
    license: "free",
    sourceUrl: "https://rive.app/community/",
    fallbackKind: "css-ceremony",
    role: "ceremony-score-reveal",
  },
  {
    id: "ceremony-chat-unlocked",
    src: "/assets/rive/ceremonies/chat-unlocked.riv",
    artboard: "Ceremony",
    stateMachine: "StateMachine",
    license: "free",
    sourceUrl: "https://rive.app/community/",
    fallbackKind: "css-ceremony",
    role: "ceremony-chat-unlocked",
  },
  {
    id: "status-searching",
    src: "/assets/rive/status/searching.riv",
    artboard: "Status",
    stateMachine: "StateMachine",
    license: "free",
    sourceUrl: "https://rive.app/community/",
    fallbackKind: "css-mascot",
    role: "status-searching",
  },
  {
    id: "status-selected",
    src: "/assets/rive/status/selected.riv",
    artboard: "Status",
    stateMachine: "StateMachine",
    license: "free",
    sourceUrl: "https://rive.app/community/",
    fallbackKind: "css-mascot",
    role: "status-selected",
  },
] as const;

export function getRiveAssets(): readonly RiveAssetDescriptor[] {
  return MANIFEST;
}

export function getRiveAsset(id: string): RiveAssetDescriptor | undefined {
  return MANIFEST.find((a) => a.id === id);
}

export function getRiveAssetsByRole(role: AssetRole): RiveAssetDescriptor[] {
  return MANIFEST.filter((a) => a.role === role);
}

export function getFallbackAssetForRole(role: AssetRole): RiveAssetDescriptor | undefined {
  return MANIFEST.find((a) => a.role === role);
}
