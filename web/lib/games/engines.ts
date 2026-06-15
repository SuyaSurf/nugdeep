import type { GameEngine } from "./game-engine";
import { theButton } from "./the-button";
import { chicken } from "./the-button";
import { quickDraw } from "./quick-draw";

const engines: Record<string, GameEngine> = {
  the_button: theButton,
  chicken,
  quick_draw: quickDraw,
};

export function getEngine(id: string): GameEngine | undefined {
  return engines[id];
}

export function getEngineOrDefault(id: string): GameEngine {
  return engines[id] ?? theButton;
}
