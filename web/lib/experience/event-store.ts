"use client";

import { create } from "zustand";
import type { ExperienceEventPayload, ExperienceEventType } from "./events";

interface ExperienceEventStore {
  queue: ExperienceEventPayload[];
  lastEvent: ExperienceEventPayload | null;
  emit: (event: ExperienceEventPayload) => void;
  consume: (type: ExperienceEventType) => ExperienceEventPayload[];
  consumeAll: () => ExperienceEventPayload[];
  clear: () => void;
}

export const useExperienceEventStore = create<ExperienceEventStore>((set, get) => ({
  queue: [],
  lastEvent: null,

  emit: (event) => {
    set((state) => ({
      queue: [...state.queue, event],
      lastEvent: event,
    }));
  },

  consume: (type) => {
    const state = get();
    const matching = state.queue.filter((e) => e.type === type);
    const remaining = state.queue.filter((e) => e.type !== type);
    set({ queue: remaining });
    return matching;
  },

  consumeAll: () => {
    const events = get().queue;
    set({ queue: [] });
    return events;
  },

  clear: () => {
    set({ queue: [], lastEvent: null });
  },
}));
