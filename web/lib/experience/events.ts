"use client";

export interface QueueSearchingPayload {
  intent: string;
  game: string;
  choice: string;
}

export interface MatchFoundPayload {
  gameId: string;
  opponent: string;
  game: string;
}

export interface GameStartPayload {
  gameId: string;
  game: string;
}

export interface RoundResolvedPayload {
  gameId: string;
  outcome: "win" | "lose" | "draw";
  myScore: number;
  theirScore: number;
  intensity: number;
}

export interface ScoreChangedPayload {
  gameId: string;
  myScore: number;
  theirScore: number;
}

export interface GameOverPayload {
  gameId: string;
  outcome: "win" | "lose" | "draw";
  myScore: number;
  theirScore: number;
  opponent: string;
}

export interface ChatUnlockedPayload {
  gameId: string;
  opponent: string;
  kind: "friend_chat" | "location_picker" | "results";
}

export interface MessageReceivedPayload {
  gameId: string;
  sender: string;
  body: string;
}

export interface NoMatchPayload {
  intent: string;
  game: string;
}

export interface AiSelectedPayload {
  characterId: string;
  characterName: string;
}

export type ExperienceEventPayload =
  | { type: "queue_searching"; payload: QueueSearchingPayload }
  | { type: "match_found"; payload: MatchFoundPayload }
  | { type: "game_start"; payload: GameStartPayload }
  | { type: "round_resolved"; payload: RoundResolvedPayload }
  | { type: "score_changed"; payload: ScoreChangedPayload }
  | { type: "game_over"; payload: GameOverPayload }
  | { type: "chat_unlocked"; payload: ChatUnlockedPayload }
  | { type: "message_received"; payload: MessageReceivedPayload }
  | { type: "no_match"; payload: NoMatchPayload }
  | { type: "ai_selected"; payload: AiSelectedPayload };

export const EVENT_TYPES = [
  "queue_searching",
  "match_found",
  "game_start",
  "round_resolved",
  "score_changed",
  "game_over",
  "chat_unlocked",
  "message_received",
  "no_match",
  "ai_selected",
] as const;

export type ExperienceEventType = (typeof EVENT_TYPES)[number];
