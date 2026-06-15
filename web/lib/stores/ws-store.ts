"use client";

import { create } from "zustand";
import { wsConnectRooms } from "@/lib/api";

export type WsMessageHandler = (msg: Record<string, unknown>) => void;

export interface WsStoreState {
  connections: Record<string, WebSocket | null>;
  handlers: Record<string, WsMessageHandler[]>;
  connect: (key: string, token: string | null | undefined, rooms: string[]) => void;
  disconnect: (key: string) => void;
  subscribe: (key: string, handler: WsMessageHandler) => () => void;
  send: (key: string, data: Record<string, unknown>) => void;
}

export const useWsStore = create<WsStoreState>((set, get) => ({
  connections: {},
  handlers: {},

  connect: (key, token, rooms) => {
    const existing = get().connections[key];
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) return;

    const ws = wsConnectRooms(token, rooms);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (typeof msg === "object" && msg !== null) {
          const handlers = get().handlers[key] ?? [];
          handlers.forEach((h) => h(msg as Record<string, unknown>));
        }
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      set((s) => ({
        connections: { ...s.connections, [key]: null },
      }));
    };

    set((s) => ({
      connections: { ...s.connections, [key]: ws },
    }));
  },

  disconnect: (key) => {
    const ws = get().connections[key];
    if (ws) { ws.close(); }
    set((s) => {
      const { [key]: _discard, ...rest } = s.connections;
      const { [key]: _handlers, ...restHandlers } = s.handlers;
      return { connections: rest, handlers: restHandlers };
    });
  },

  subscribe: (key, handler) => {
    set((s) => ({
      handlers: {
        ...s.handlers,
        [key]: [...(s.handlers[key] ?? []), handler],
      },
    }));
    return () => {
      set((s) => ({
        handlers: {
          ...s.handlers,
          [key]: (s.handlers[key] ?? []).filter((h) => h !== handler),
        },
      }));
    };
  },

  send: (key, data) => {
    const ws = get().connections[key];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  },
}));
