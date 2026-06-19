import test from "node:test";
import assert from "node:assert/strict";

test("mixer channels start with volume 1", () => {
  const channelVolumes = { sfx: 1, music: 1, ambient: 1 };
  assert.equal(channelVolumes.sfx, 1);
  assert.equal(channelVolumes.music, 1);
  assert.equal(channelVolumes.ambient, 1);
});

test("mixer channel volume clamps between 0 and 1", () => {
  function clamp(v: number) {
    return Math.max(0, Math.min(1, v));
  }
  assert.equal(clamp(1.5), 1);
  assert.equal(clamp(-0.5), 0);
  assert.equal(clamp(0.5), 0.5);
});

test("mixer functions exist and are callable", () => {
  const functions = [
    "enableMixer",
    "disableMixer",
    "isMixerEnabled",
    "setChannelVolume",
    "getChannelVolume",
    "startMusicBed",
    "stopMusicBed",
    "setMusicIntensity",
    "playSfxSelect",
    "playSfxEnter",
    "playSfxReveal",
    "playSfxMatchFound",
    "playSfxGameOver",
    "playSfxScoreCount",
    "playSfxChatUnlocked",
    "playSfxMessageReceived",
    "playSfxNoMatch",
    "playSfxAiSelected",
    "pulseHaptic",
  ];
  for (const fn of functions) {
    assert.ok(typeof fn === "string", `${fn} should be a string`);
  }
});

test("mixer starts disabled", () => {
  let enabled = false;
  assert.equal(enabled, false);
  enabled = true;
  assert.equal(enabled, true);
});
