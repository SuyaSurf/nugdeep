import type { GameEngine } from "./game-engine";
import { theButton } from "./the-button";
import { chicken } from "./the-button";
import { quickDraw } from "./quick-draw";
import { diceFate } from "./dice-fate";
import { simulPick } from "./simul-pick";
import { whichOne } from "./which-one";
import { palette } from "./palette";
import { foodRemedy } from "./food-remedy";

const engines: Record<string, GameEngine> = {
  the_button: theButton,
  chicken,
  quick_draw: quickDraw,
  dice_fate: diceFate,
  simul_pick: simulPick,
  which_one: whichOne,
  palette,
  food_remedy: foodRemedy,
};

export function getEngine(id: string): GameEngine | undefined {
  return engines[id];
}

export function getEngineOrDefault(id: string): GameEngine {
  return engines[id] ?? theButton;
}
