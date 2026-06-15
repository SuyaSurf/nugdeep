import type { GameEngine } from "./game-engine";
import { theButton } from "./the-button";
import { chicken } from "./the-button";

const engines: Record<string, GameEngine> = {
  the_button: theButton,
  chicken,
};

export function getEngine(id: string): GameEngine | undefined {
  return engines[id];
}

export function getEngineOrDefault(id: string): GameEngine {
  return engines[id] ?? theButton;
}
