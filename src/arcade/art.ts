/**
 * Art shared by the arcade games. Everything is text: one character per pixel, "." is empty.
 * House style (matches the mascots and Our Room): dark outline, flat fills, one shade.
 */
import { OVERLAY_PALETTE, PALETTES, SPRITES } from "@/components/pixel-critters";
import type { SpriteDef } from "@/arcade/engine/types";

/** The outline colour used for everything the player can touch. */
export const INK = "#3E3A55";

type Critter = keyof typeof SPRITES;
type Pose = keyof (typeof SPRITES)["cat"];

/**
 * One of the app's mascots (24×24) as a game sprite. `extras: false` leaves out the little
 * pose decorations (sparkles, hearts, z's) so only the body is drawn.
 */
export function critter(name: Critter, pose: Pose, extras = false): SpriteDef {
  return {
    rows: SPRITES[name][pose],
    palette: extras ? { ...PALETTES[name], ...OVERLAY_PALETTE } : PALETTES[name],
  };
}

export const HEART: SpriteDef = {
  palette: { o: INK, r: "#FF6F9C", w: "#FFD3E1", d: "#E0406F" },
  rows: [
    "..ooo.ooo..",
    ".orrrorrro.",
    "orwwrrrrrro",
    "orwrrrrrrro",
    "orrrrrrrrro",
    ".orrrrrrdo.",
    "..orrrrdo..",
    "...orrdo...",
    "....odo....",
    ".....o.....",
  ],
};

/** A soft background cloud (no outline, so it stays behind the action). */
export const CLOUD_BIG: SpriteDef = {
  palette: { w: "#FFFFFF", s: "#E3ECFA" },
  rows: [
    "......wwwww...........",
    "....wwwwwwwww...wwww..",
    "..wwwwwwwwwwwwwwwwwwww",
    ".wwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwww",
    ".sswwwwwwwwwwwwwwwwss.",
    "...ssssswwwwwsssss....",
  ],
};

export const CLOUD_SMALL: SpriteDef = {
  palette: { w: "#FFFFFF", s: "#E3ECFA" },
  rows: ["...wwww.....", ".wwwwwwww...", "wwwwwwwwwwww", ".swwwwwwwws.", "...ssssss..."],
};

export const MOON: SpriteDef = {
  palette: { o: "#FFE9A8", y: "#FFF6D6", d: "#F0DD9C" },
  rows: [
    ".....oooo.....",
    "...ooyyyyoo...",
    "..oyyyyyyyyo..",
    ".oyyyyyydyyyo.",
    ".oyydyyyyyyyo.",
    "oyyyyyyyyyyyyo",
    "oyyyyyyyyydyyo",
    "oyyyyydyyyyyyo",
    "oyyyyyyyyyyyyo",
    ".oyyyyyyyyyyo.",
    ".oyydyyyyyyyo.",
    "..oyyyyyyyyo..",
    "...ooyyyyoo...",
    ".....oooo.....",
  ],
};

/** A four-point twinkle, for stars and pick-up sparkles. */
export const SPARKLE: SpriteDef = {
  palette: { y: "#FFE680", w: "#FFFFFF" },
  rows: ["..y..", "..y..", "yywyy", "..y..", "..y.."],
};

/** Mix two "#rrggbb" colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const x = (pa >> shift) & 255;
    const y = (pb >> shift) & 255;
    return Math.round(x + (y - x) * t) << shift;
  };
  // Returned as "#rrggbb" again so the result can be mixed further.
  return `#${(ch(16) | ch(8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/** A cheap repeatable "random" number in [0, 1) from a whole number — for scenery placement. */
export function hash(n: number): number {
  let t = (n * 374761393 + 668265263) | 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

/**
 * Fill the whole picture with a banded sky: hard-edged colour bands from `top` to `bottom`,
 * which reads as pixel art instead of a smooth gradient.
 */
export function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  top: string,
  bottom: string,
  bands = 12,
) {
  const bandH = Math.ceil(h / bands);
  for (let i = 0; i < bands; i += 1) {
    ctx.fillStyle = mix(top, bottom, i / (bands - 1));
    ctx.fillRect(0, i * bandH, w, bandH);
  }
}
