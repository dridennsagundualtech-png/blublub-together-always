import type { SpriteDef } from "@/arcade/engine/types";

/**
 * Sprites are authored as text (one character per pixel) and painted once onto a tiny
 * off-screen canvas; after that drawing one is a single fast drawImage call.
 */
export type Sprite = {
  w: number;
  h: number;
  /** Normal and mirrored bitmaps. */
  img: HTMLCanvasElement;
  flip: HTMLCanvasElement;
};

function paint(def: SpriteDef, mirrored: boolean): HTMLCanvasElement {
  const h = def.rows.length;
  const w = def.rows.reduce((m, r) => Math.max(m, r.length), 0);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  def.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const colour = def.palette[row[x]!];
      if (!colour) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(mirrored ? w - 1 - x : x, y, 1, 1);
    }
  });
  return canvas;
}

const cache = new WeakMap<SpriteDef, Sprite>();

/** The ready-to-draw bitmap for a sprite definition (built on first use, then reused). */
export function sprite(def: SpriteDef): Sprite {
  let s = cache.get(def);
  if (!s) {
    const img = paint(def, false);
    s = { w: img.width, h: img.height, img, flip: paint(def, true) };
    cache.set(def, s);
  }
  return s;
}

/**
 * Draw a sprite with its top-left corner at (x, y), snapped to whole pixels.
 * `squash` < 1 presses it down onto its feet, > 1 stretches it up (still anchored at the feet).
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  def: SpriteDef,
  x: number,
  y: number,
  opts?: { flip?: boolean; squash?: number; alpha?: number },
) {
  const s = sprite(def);
  const src = opts?.flip ? s.flip : s.img;
  const squash = opts?.squash ?? 1;
  const prevAlpha = ctx.globalAlpha;
  if (opts?.alpha != null) ctx.globalAlpha = prevAlpha * opts.alpha;
  if (squash === 1) {
    ctx.drawImage(src, Math.round(x), Math.round(y));
  } else {
    const h = Math.max(1, Math.round(s.h * squash));
    const w = Math.max(1, Math.round(s.w * (2 - squash)));
    ctx.drawImage(
      src,
      0,
      0,
      s.w,
      s.h,
      Math.round(x - (w - s.w) / 2),
      Math.round(y + s.h - h),
      w,
      h,
    );
  }
  ctx.globalAlpha = prevAlpha;
}

/** A sprite definition with some palette entries removed (e.g. hide the sparkle overlay). */
export function without(def: SpriteDef, chars: string): SpriteDef {
  const palette: Record<string, string> = {};
  for (const [key, colour] of Object.entries(def.palette)) {
    if (!chars.includes(key)) palette[key] = colour;
  }
  return { rows: def.rows, palette };
}
