import test from "node:test";
import assert from "node:assert/strict";
import { getAICharacters, getAICharacter, pickAICharacters } from "./ai-characters.ts";

test("all AI characters have extended fields", () => {
  for (const char of getAICharacters()) {
    assert.ok(char.mood, `${char.id} missing mood`);
    assert.ok(char.assetId, `${char.id} missing assetId`);
    assert.ok(char.voiceCue, `${char.id} missing voiceCue`);
    assert.ok(char.reactionMap, `${char.id} missing reactionMap`);
    assert.ok(char.reactionMap.selected, `${char.id} missing selected reaction`);
    assert.ok(char.reactionMap.thinking, `${char.id} missing thinking reaction`);
    assert.ok(char.reactionMap.win, `${char.id} missing win reaction`);
    assert.ok(char.reactionMap.lose, `${char.id} missing lose reaction`);
  }
});

test("characters have valid assetId references", () => {
  for (const char of getAICharacters()) {
    assert.ok(char.assetId.startsWith("mascot-"), `${char.id} assetId should start with mascot-`);
  }
});

test("reactionMap entries have sound and text", () => {
  for (const char of getAICharacters()) {
    for (const [mood, reaction] of Object.entries(char.reactionMap)) {
      assert.ok(["fanfare", "sigh", "buzz", "bell"].includes(reaction.sound), `${char.id} ${mood} invalid sound`);
      assert.ok(typeof reaction.text === "string" && reaction.text.length > 0, `${char.id} ${mood} missing text`);
    }
  }
});

test("pickAICharacters returns correct count", () => {
  const picked = pickAICharacters(2, "test-seed");
  assert.equal(picked.length, 2);
});

test("pickAICharacters returns unique characters", () => {
  const picked = pickAICharacters(4, "test-seed");
  const ids = new Set(picked.map((c) => c.id));
  assert.equal(ids.size, picked.length);
});

test("getAICharacter returns correct character by id", () => {
  const char = getAICharacter("mira");
  assert.ok(char);
  assert.equal(char?.name, "Mira");
  assert.equal(char?.level, 4);
});
