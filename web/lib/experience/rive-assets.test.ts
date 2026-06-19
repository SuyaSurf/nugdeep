import test from "node:test";
import assert from "node:assert/strict";
import { getRiveAssets, getRiveAsset, getRiveAssetsByRole, getFallbackAssetForRole } from "./rive-assets.ts";

test("manifest contains all required asset roles", () => {
  const assets = getRiveAssets();
  const roles = assets.map((a) => a.role);
  assert.ok(roles.includes("mascot"));
  assert.ok(roles.includes("ceremony-match-found"));
  assert.ok(roles.includes("ceremony-game-over"));
  assert.ok(roles.includes("ceremony-score-reveal"));
  assert.ok(roles.includes("ceremony-chat-unlocked"));
  assert.ok(roles.includes("status-searching"));
  assert.ok(roles.includes("status-selected"));
});

test("every asset has license and sourceUrl recorded", () => {
  for (const asset of getRiveAssets()) {
    assert.ok(asset.license, `Asset ${asset.id} missing license`);
    assert.ok(asset.sourceUrl, `Asset ${asset.id} missing sourceUrl`);
    assert.ok(["free", "remix", "commercial"].includes(asset.license), `Asset ${asset.id} has invalid license`);
  }
});

test("every asset has a fallbackKind", () => {
  for (const asset of getRiveAssets()) {
    assert.ok(["css-mascot", "css-ceremony", "css-badge", "none"].includes(asset.fallbackKind));
  }
});

test("getRiveAsset returns correct asset by id", () => {
  const asset = getRiveAsset("mascot-dianey");
  assert.ok(asset);
  assert.equal(asset?.role, "mascot");
  assert.equal(asset?.id, "mascot-dianey");
});

test("getRiveAsset returns undefined for missing id", () => {
  const asset = getRiveAsset("non-existent");
  assert.equal(asset, undefined);
});

test("getRiveAssetsByRole returns only assets matching role", () => {
  const mascots = getRiveAssetsByRole("mascot");
  assert.ok(mascots.length >= 4);
  assert.ok(mascots.every((a) => a.role === "mascot"));
});

test("getRiveAssetsByRole returns empty for unknown role", () => {
  const result = getRiveAssetsByRole("status-searching" as never);
  assert.equal(result.length, 1);
});

test("fallback asset for role is first matching asset", () => {
  const fallback = getFallbackAssetForRole("ceremony-chat-unlocked");
  assert.ok(fallback);
  assert.equal(fallback?.role, "ceremony-chat-unlocked");
});
