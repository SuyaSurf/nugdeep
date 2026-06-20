"use client";

export type GameCategory = "nerve" | "reflex" | "psychology" | "social" | "strategy" | "knowledge" | "visual";

export interface GameRound {
  number: number;
  prompt: string;
  timeLimit: number;
}

export interface GameResult {
  winner: "me" | "them" | "draw";
  myScore: number;
  theirScore: number;
  summary: string;
}

export interface GameOptions {
  aiDifficulty?: number;
}

export interface GameState {
  round: GameRound;
  status: "waiting" | "playing" | "resolved";
  myInput: unknown;
  theirInput: unknown;
  timeRemaining: number;
}

export interface GameEngine {
  id: string;
  name: string;
  maxRounds: number;
  roundTime: number;

  createInitialState: (seed?: string, options?: GameOptions) => GameState;
  processInput: (state: GameState, input: unknown) => GameState;
  resolve: (myState: GameState, theirState: GameState, options?: GameOptions) => GameResult;

  Renderer: React.ComponentType<{
    state: GameState;
    isMyTurn: boolean;
    onInput: (input: unknown) => void;
    result?: GameResult;
  }>;
}
