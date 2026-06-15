"use client";

export interface ChatMessage {
  id: string;
  sender: "me" | "them";
  body: string;
  timestamp: number;
  type: "text" | "voice" | "system";
}

export interface IncomingChatEvent {
  type: "chat:message";
  payload: {
    sender_id: string;
    body: string;
    timestamp: number;
  };
}

export function createChatMessage(body: string, sender: "me" | "them", type: ChatMessage["type"] = "text"): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sender,
    body,
    timestamp: Date.now(),
    type,
  };
}

export function isChatEvent(msg: unknown): msg is IncomingChatEvent {
  return (msg as Record<string, unknown>)?.type === "chat:message";
}
