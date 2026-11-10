import type { ArcadeGame } from "@/arcade/engine/types";
import { H, W, createWing, stepWing, wingDemo, type WingState } from "@/arcade/games/wing/logic";
import { renderWing } from "@/arcade/games/wing/render";
import { BIRD_DOWN, BIRD_UP } from "@/arcade/games/wing/sprites";

export const wingGame: ArcadeGame<WingState> = {
  id: "wing",
  title: "Wing It",
  blurb: "Flap the penguin through the ice gaps",
  howTo: ["Tap to flap. Don't touch the ice or the sea.", "Catch a fish for 3 extra points."],
  unit: "points",
  width: W,
  height: H,
  create: createWing,
  step: stepWing,
  status: (s) => ({ score: s.score, over: s.over }),
  stats: (s) => [
    { label: "Pillars", value: String(s.passed) },
    { label: "Fish", value: String(s.fishCaught) },
  ],
  demo: wingDemo,
  takeSounds: (s) => s.sounds.splice(0),
  render: renderWing,
  icon: [BIRD_UP, BIRD_DOWN],
};
