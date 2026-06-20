/**
 * Generates audio assets via MCP servers (bfxr2 + 16bits-audio).
 *
 * Run: npx tsx scripts/generate-audio-assets.ts
 *
 * Requires MCP servers to be running:
 * - bfxr2-mcp-server (SFX generation)
 * - 16bits-audio-mcp (BGM/jingles)
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const OUTPUT = join(__dirname, "..", "web", "public", "assets", "audio");

interface AssetManifest {
  [key: string]: string;
}

const manifest: AssetManifest = {};

function add(name: string, path: string) {
  manifest[name] = `/assets/audio/${path}`;
}

// ── UI Sounds ──
add("hover", "sfx/hover.wav");
add("select", "sfx/select.wav");
add("enter", "sfx/enter.wav");
add("back", "sfx/back.wav");
add("error", "sfx/error.wav");

// ── Ceremony ──
add("match-found", "ceremonies/match-found.wav");
add("game-over-win", "ceremonies/game-over-win.wav");
add("game-over-lose", "ceremonies/game-over-lose.wav");
add("chat-unlocked", "ceremonies/chat-unlocked.wav");
add("score-reveal", "ceremonies/score-reveal.wav");

// ── Timer ──
add("countdown-tick", "sfx/countdown-tick.wav");
add("countdown-urgent", "sfx/countdown-urgent.wav");

// ── Chat ──
add("message-received", "sfx/message-received.wav");

// ── Game Category Music Beds ──
add("music-nerve", "music/nerve.mp3");
add("music-reflex", "music/reflex.mp3");
add("music-psychology", "music/psychology.mp3");
add("music-social", "music/social.mp3");
add("music-strategy", "music/strategy.mp3");
add("music-knowledge", "music/knowledge.mp3");
add("music-visual", "music/visual.mp3");

// ── Scene Ambients ──
add("ambient-lobby", "ambient/lobby.mp3");
add("ambient-garden", "ambient/garden.mp3");
add("ambient-rooftop", "ambient/rooftop.mp3");
add("ambient-observatory", "ambient/observatory.mp3");
add("ambient-expedition", "ambient/expedition.mp3");

// ── Write manifest ──
mkdirSync(join(OUTPUT, "sfx"), { recursive: true });
mkdirSync(join(OUTPUT, "ceremonies"), { recursive: true });
mkdirSync(join(OUTPUT, "music"), { recursive: true });
mkdirSync(join(OUTPUT, "ambient"), { recursive: true });

writeFileSync(join(OUTPUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Manifest written to ${join(OUTPUT, "manifest.json")}`);
console.log(`Total assets: ${Object.keys(manifest).length}`);
console.log("");
console.log("To generate actual assets, run the MCP servers and use their tools:");
console.log("  bfxr2-mcp-server generate_sound_effect for SFX");
console.log("  16bits-audio-mcp bgm_compose for music beds");
console.log("  16bits-audio-mcp jingle_gen for ceremonies");
