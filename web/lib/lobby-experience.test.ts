import test from "node:test";
import assert from "node:assert/strict";

import {
  getDailyGameLineup,
  getIntentHandoff,
  getIntentOptions,
} from "./lobby-experience.ts";

const games = [
  { id: "nerve-a", category: "nerve", status: "ready" },
  { id: "nerve-b", category: "nerve", status: "ready" },
  { id: "social-a", category: "social", status: "ready" },
  { id: "social-b", category: "social", status: "ready" },
  { id: "visual-a", category: "visual", status: "coming_soon" },
] as const;

test("daily game lineup is stable for everyone on the same day", () => {
  const first = getDailyGameLineup(games, "2026-06-15");
  const second = getDailyGameLineup([...games].reverse(), "2026-06-15");

  assert.deepEqual(first, second);
});

test("daily game lineup contains at most one ready game per genre", () => {
  const lineup = getDailyGameLineup(games, "2026-06-15");
  const categories = lineup.map((game) => game.category);

  assert.equal(lineup.length, 2);
  assert.equal(new Set(categories).size, categories.length);
  assert.equal(lineup.some((game) => game.status !== "ready"), false);
});

test("all three intents are available and route to distinct handoffs", () => {
  assert.deepEqual(
    getIntentOptions().map((intent) => intent.id),
    ["speed_date", "make_friend", "just_play"],
  );
  assert.equal(getIntentHandoff("speed_date"), "location_picker");
  assert.equal(getIntentHandoff("make_friend"), "friend_chat");
  assert.equal(getIntentHandoff("just_play"), "results");
});
