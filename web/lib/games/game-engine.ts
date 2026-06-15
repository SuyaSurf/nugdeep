"use client";

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

  createInitialState: (seed?: string) => GameState;
  processInput: (state: GameState, input: unknown) => GameState;
  resolve: (myState: GameState, theirState: GameState) => GameResult;

  Renderer: React.ComponentType<{
    state: GameState;
    isMyTurn: boolean;
    onInput: (input: unknown) => void;
    result?: GameResult;
  }>;
}
