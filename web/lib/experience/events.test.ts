import test from "node:test";
import assert from "node:assert/strict";
import type { ExperienceEventPayload } from "./events";

function createEventStore() {
  let items: ExperienceEventPayload[] = [];
  let last: ExperienceEventPayload | null = null;

  return {
    get queue() { return items; },
    get lastEvent() { return last; },
    emit: (event: ExperienceEventPayload) => {
      items = [...items, event];
      last = event;
    },
    consume: (type: string) => {
      const matching = items.filter((e) => e.type === type);
      items = items.filter((e) => e.type !== type);
      return matching;
    },
    consumeAll: () => {
      const events = items;
      items = [];
      return events;
    },
    clear: () => {
      items = [];
      last = null;
    },
  };
}

test("event types are correctly defined", () => {
  const types = [
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
  assert.equal(types.length, 10);
  assert.ok(types.includes("match_found"));
  assert.ok(types.includes("game_over"));
  assert.ok(types.includes("chat_unlocked"));
});

test("event store emits and consumes events", () => {
  const store = createEventStore();

  store.emit({ type: "queue_searching", payload: { intent: "just_play", game: "nerve", choice: "1" } });
  store.emit({ type: "match_found", payload: { gameId: "abc", opponent: "Player", game: "nerve" } });

  const found = store.consume("match_found");
  assert.equal(found.length, 1);
  assert.equal(found[0].type, "match_found");

  const remaining = store.consume("queue_searching");
  assert.equal(remaining.length, 1);

  const empty = store.consume("game_start");
  assert.equal(empty.length, 0);
});

test("events can be consumed in order", () => {
  const store = createEventStore();

  store.emit({ type: "game_start", payload: { gameId: "1", game: "nerve" } });
  store.emit({ type: "score_changed", payload: { gameId: "1", myScore: 1, theirScore: 0 } });
  store.emit({ type: "game_over", payload: { gameId: "1", outcome: "win", myScore: 3, theirScore: 1, opponent: "P2" } });

  const all = store.consumeAll();
  assert.equal(all.length, 3);
  assert.equal(all[0].type, "game_start");
  assert.equal(all[1].type, "score_changed");
  assert.equal(all[2].type, "game_over");
});

test("lastEvent tracks most recent event", () => {
  const store = createEventStore();

  assert.equal(store.lastEvent, null);

  store.emit({ type: "queue_searching", payload: { intent: "just_play", game: "reflex", choice: "3" } });
  assert.equal(store.lastEvent!.type, "queue_searching");

  store.emit({ type: "match_found", payload: { gameId: "xyz", opponent: "Signal", game: "reflex" } });
  assert.equal(store.lastEvent!.type, "match_found");
});

test("clear resets store", () => {
  const store = createEventStore();

  store.emit({ type: "game_start", payload: { gameId: "1", game: "nerve" } });
  store.emit({ type: "game_over", payload: { gameId: "1", outcome: "win", myScore: 1, theirScore: 0, opponent: "P2" } });
  store.clear();

  assert.equal(store.lastEvent, null);
  assert.equal(store.queue.length, 0);
});
