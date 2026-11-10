/**
 * A tiny 3×5 bitmap font for text drawn inside the game picture (scores, "+5" pop-ups,
 * zone banners). Each glyph is 5 rows of 3 bits, written top to bottom.
 */
const GLYPHS: Record<string, readonly string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", ".##", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  C: [".##", "#..", "#..", "#..", ".##"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  F: ["###", "#..", "##.", "#..", "#.."],
  G: [".##", "#..", "#.#", "#.#", ".##"],
  H: ["#.#", "#.#", "###", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["..#", "..#", "..#", "#.#", ".#."],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
  L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#.#", "###", "###", "#.#", "#.#"],
  N: ["##.", "#.#", "#.#", "#.#", "#.#"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."],
  P: ["##.", "#.#", "##.", "#..", "#.."],
  Q: [".#.", "#.#", "#.#", "###", ".##"],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  V: ["#.#", "#.#", "#.#", "#.#", ".#."],
  W: ["#.#", "#.#", "###", "###", "#.#"],
  X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
  Z: ["###", "..#", ".#.", "#..", "###"],
  "+": ["...", ".#.", "###", ".#.", "..."],
  "-": ["...", "...", "###", "...", "..."],
  "!": [".#.", ".#.", ".#.", "...", ".#."],
  x: ["...", "#.#", ".#.", "#.#", "..."],
  ".": ["...", "...", "...", "...", ".#."],
  " ": ["...", "...", "...", "...", "..."],
};

export const GLYPH_W = 3;
export const GLYPH_H = 5;

/** Width in game pixels of `text` at the given scale (glyphs are 1 pixel apart). */
export function textWidth(text: string, scale = 1): number {
  return text.length === 0 ? 0 : (text.length * (GLYPH_W + 1) - 1) * scale;
}

function plot(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  colour: string,
) {
  ctx.fillStyle = colour;
  let cx = Math.round(x);
  const cy = Math.round(y);
  for (const ch of text) {
    const glyph = GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()];
    if (glyph) {
      for (let row = 0; row < GLYPH_H; row += 1) {
        const bits = glyph[row]!;
        for (let col = 0; col < GLYPH_W; col += 1) {
          if (bits[col] === "#") ctx.fillRect(cx + col * scale, cy + row * scale, scale, scale);
        }
      }
    }
    cx += (GLYPH_W + 1) * scale;
  }
}

/**
 * Draw text in game pixels. `align` positions it around x. An `outline` colour draws a
 * 1-pixel border so the text stays readable over any background.
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts?: {
    scale?: number;
    colour?: string;
    outline?: string;
    align?: "left" | "center" | "right";
  },
) {
  const scale = opts?.scale ?? 1;
  const width = textWidth(text, scale);
  const align = opts?.align ?? "left";
  const left = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
  if (opts?.outline) {
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      plot(ctx, text, left + dx, y + dy, scale, opts.outline);
    }
  }
  plot(ctx, text, left, y, scale, opts?.colour ?? "#ffffff");
}
