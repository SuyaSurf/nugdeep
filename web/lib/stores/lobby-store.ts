"use client";

import { create } from "zustand";
import type { LobbyIntent } from "@/lib/lobby-experience";

export type LobbyPhase =
  | "intent"
  | "game"
  | "activity"
  | "queued"
  | "matched"
  | "playing"
  | "location"
  | "chat"
  | "results"
  | "no_match"
  | "date_room";

export interface MatchState {
  id: string;
  opponent: string;
  game: string;
}

export interface LobbyState {
  phase: LobbyPhase;
  intent: LobbyIntent;
  game: string;
  choice: string;
  match: MatchState | null;
  location: string;

  setPhase: (phase: LobbyPhase) => void;
  setIntent: (intent: LobbyIntent) => void;
  setGame: (game: string) => void;
  setChoice: (choice: string) => void;
  setMatch: (match: MatchState | null) => void;
  setLocation: (location: string) => void;
  reset: () => void;
}

const INITIAL = {
  phase: "intent" as LobbyPhase,
  intent: "just_play" as LobbyIntent,
  game: "",
  choice: "",
  match: null as MatchState | null,
  location: "",
};

export const useLobbyStore = create<LobbyState>((set) => ({
  ...INITIAL,
  setPhase: (phase) => set({ phase }),
  setIntent: (intent) => set({ intent }),
  setGame: (game) => set({ game }),
  setChoice: (choice) => set({ choice }),
  setMatch: (match) => set({ match }),
  setLocation: (location) => set({ location }),
  reset: () => set(INITIAL),
}));
