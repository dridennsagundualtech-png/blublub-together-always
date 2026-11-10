import { INK } from "@/arcade/art";
import type { SpriteDef } from "@/arcade/engine/types";

/** Same colours as the app's penguin mascot, so it is clearly the same character. */
const PENGUIN = {
  o: "#22284A",
  c: "#3B4A7A",
  d: "#2E3A63",
  f: "#F2F4FA",
  p: "#FFB547",
  e: "#22284A",
  b: "#FFA3BE",
  // The wing is a shade lighter than the body so its movement is easy to see.
  w: "#5868A0",
};

/** The penguin seen from the side, flying right. The wing is drawn separately (three poses). */
export const BIRD_BODY: SpriteDef = {
  palette: PENGUIN,
  rows: [
    "......ooooooo.....",
    "....ooccccccoo....",
    "...occccccccccoo..",
    "..occcccfffffffo..",
    "..occccfffffeffo..",
    ".occcccfffffeffpp.",
    ".occcccfffbbfffppp",
    ".occcccffffffffoo.",
    "ooccccccfffffffo..",
    "odccccccfffffffo..",
    ".odcccccffffffo...",
    "..odccccfffffo....",
    "...oodccffffo.....",
    ".....oooooooo.....",
    "......pp..pp......",
    "......ppp.ppp.....",
  ],
};

/** Wing raised (gliding / falling). Sits at body offset (1, 1). */
export const WING_UP: SpriteDef = {
  palette: PENGUIN,
  rows: [".oo...", "owwo..", "owwwo.", ".owwwo", ".owwwo", "..owwo", "...oo."],
};

/** Wing level (between strokes). Sits at body offset (1, 6). */
export const WING_MID: SpriteDef = {
  palette: PENGUIN,
  rows: [".oooooo.", "owwwwwwo", ".owwwwo.", "..oooo.."],
};

/** Wing pushed down (the flap itself). Sits at body offset (1, 7). */
export const WING_DOWN: SpriteDef = {
  palette: PENGUIN,
  rows: ["...oo.", "..owwo", ".owwwo", ".owwwo", "owwwo.", "owwo..", ".oo..."],
};

/** A fish to catch between the pillars. */
export const FISH: SpriteDef = {
  palette: { o: INK, y: "#FFB547", s: "#FFDDA6", e: "#22284A" },
  rows: [
    "..oooo....",
    ".oyyyyo..o",
    "oyeyyyyoyo",
    "oyyyyyyyyo",
    "oyyssyyoyo",
    ".oyyyyo..o",
    "..oooo....",
  ],
};

/** Layer `over` on top of `base` at (dx, dy) and return the result as one sprite. */
export function compose(base: SpriteDef, over: SpriteDef, dx: number, dy: number): SpriteDef {
  const rows = base.rows.map((r) => r.split(""));
  over.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x]!;
      const target = rows[y + dy];
      if (ch !== "." && target && x + dx >= 0 && x + dx < target.length) target[x + dx] = ch;
    }
  });
  return { palette: { ...base.palette, ...over.palette }, rows: rows.map((r) => r.join("")) };
}

export const BIRD_UP = compose(BIRD_BODY, WING_UP, 1, 1);
export const BIRD_MID = compose(BIRD_BODY, WING_MID, 1, 6);
export const BIRD_DOWN = compose(BIRD_BODY, WING_DOWN, 1, 7);
