import { critter } from "@/arcade/art";
import type { ArcadeGame } from "@/arcade/engine/types";
import { H, W, createHop, hopDemo, metres, stepHop, type HopState } from "@/arcade/games/hop/logic";
import { renderHop } from "@/arcade/games/hop/render";

export const hopGame: ArcadeGame<HopState> = {
  id: "hop",
  title: "Hop Up",
  blurb: "Bounce up the clouds — higher steps pay more",
  howTo: ["Hold the left or right side to steer.", "Higher clouds are worth more points."],
  unit: "points",
  width: W,
  height: H,
  create: createHop,
  step: stepHop,
  status: (s) => ({ score: s.score, over: s.over }),
  stats: (s) => [
    { label: "Height", value: `${metres(s)} m` },
    { label: "Hearts", value: String(s.hearts) },
  ],
  demo: hopDemo,
  takeSounds: (s) => s.sounds.splice(0),
  render: renderHop,
  icon: [critter("cat", "default"), critter("cat", "cheer")],
};
