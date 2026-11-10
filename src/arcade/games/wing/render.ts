/** WING IT — drawing only. Reads a WingState and paints one frame; never changes the state. */
import { CLOUD_BIG, CLOUD_SMALL, INK, MOON, SPARKLE, drawSky, hash, mix } from "@/arcade/art";
import { drawText } from "@/arcade/engine/font";
import { drawSprite } from "@/arcade/engine/sprite";
import {
  BIRD_X,
  H,
  PILLAR_W,
  SEA,
  W,
  type Pillar,
  type WingState,
} from "@/arcade/games/wing/logic";
import { BIRD_DOWN, BIRD_MID, BIRD_UP, FISH } from "@/arcade/games/wing/sprites";

/** The sky changes every 10 points: day, golden hour, dusk, polar night. */
const SKIES = [
  { top: "#8FCBFF", bottom: "#E6F6FF" },
  { top: "#FFB69E", bottom: "#FFE7B8" },
  { top: "#6A5AA0", bottom: "#FFB6C9" },
  { top: "#16193A", bottom: "#3B4A7A" },
] as const;
const POINTS_PER_SKY = 10;

const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** A stepped triangle: one iceberg on the horizon. */
function drawBerg(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  light: string,
  shade: string,
) {
  for (let r = 0; r < h; r += 2) {
    const half = Math.max(1, Math.round((w / 2) * ((r + 2) / h)));
    const y = baseY - h + r;
    ctx.fillStyle = light;
    ctx.fillRect(Math.round(cx - half), y, half * 2, 2);
    ctx.fillStyle = shade;
    const lit = Math.round(half * 0.3);
    ctx.fillRect(Math.round(cx + lit), y, half - lit, 2);
  }
}

function drawBackdrop(ctx: CanvasRenderingContext2D, s: WingState, frame: number) {
  const z = s.score / POINTS_PER_SKY;
  const last = SKIES.length - 1;
  const i = Math.min(last, Math.floor(z));
  const blend = i >= last ? 0 : clamp01((z - i - 0.7) / 0.3);
  const a = SKIES[i]!;
  const b = SKIES[Math.min(last, i + 1)]!;
  drawSky(ctx, W, SEA, mix(a.top, b.top, blend), mix(a.bottom, b.bottom, blend), 10);

  const night = clamp01(i + blend - 2);

  if (night > 0) {
    // Northern lights: soft curtains that sway.
    for (let x = 0; x < W; x += 2) {
      const wave = Math.sin(x * 0.07 + frame * 0.012) + Math.sin(x * 0.023 - frame * 0.007);
      const top = 26 + Math.round(wave * 9);
      const tall = 30 + Math.round(Math.sin(x * 0.11 + frame * 0.02) * 10);
      ctx.globalAlpha = night * (0.16 + 0.08 * Math.sin(x * 0.3 + frame * 0.03));
      ctx.fillStyle = x % 12 < 6 ? "#7DF5C0" : "#8FD8FF";
      ctx.fillRect(x, top, 2, tall);
      ctx.fillStyle = "#FF9FD0";
      ctx.fillRect(x, top + tall, 2, 6);
    }
    ctx.globalAlpha = night;
    for (let j = 0; j < 34; j += 1) {
      if ((Math.floor(frame / 18) + j) % 8 === 0) continue;
      const x = Math.floor(mod(hash(j * 2 + 1) * W - s.travelled * 0.03, W));
      const y = Math.floor(hash(j * 2 + 2) * (SEA - 50));
      if (j % 9 === 0) drawSprite(ctx, SPARKLE, x - 2, y - 2);
      else {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(x, y, 1, 1);
      }
    }
    drawSprite(ctx, MOON, W - 32, 22);
    ctx.globalAlpha = 1;
  }

  // Icebergs far away move slowly, clouds a little faster: depth.
  const light = mix("#F4FBFF", "#6E7FB8", night);
  const shade = mix("#CDE7FA", "#4A5A92", night);
  const strip = 5 * 64;
  for (let k = 0; k < 5; k += 1) {
    const x = mod(k * 64 + hash(k + 7) * 30 - s.travelled * 0.14, strip) - 40;
    if (x > W + 40) continue;
    drawBerg(ctx, x, SEA, 34 + hash(k + 3) * 30, 20 + Math.round(hash(k + 11) * 26), light, shade);
  }
  ctx.globalAlpha = 0.85 - night * 0.55;
  const band = 4 * 80;
  for (let k = 0; k < 4; k += 1) {
    const x = mod(k * 80 + hash(k + 21) * 40 - s.travelled * 0.32, band) - 30;
    if (x > W) continue;
    drawSprite(ctx, k % 2 === 0 ? CLOUD_BIG : CLOUD_SMALL, x, 18 + Math.round(hash(k + 40) * 70));
  }
  ctx.globalAlpha = 1;
}

function drawIce(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number) {
  if (y1 <= y0) return;
  ctx.fillStyle = INK;
  ctx.fillRect(x, y0, PILLAR_W, y1 - y0);
  ctx.fillStyle = "#BFE6FF";
  ctx.fillRect(x + 1, y0, PILLAR_W - 2, y1 - y0);
  ctx.fillStyle = "#F2FBFF";
  ctx.fillRect(x + 3, y0, 3, y1 - y0);
  ctx.fillStyle = "#8FC8F0";
  ctx.fillRect(x + PILLAR_W - 6, y0, 4, y1 - y0);
  // A few cracks, fixed to the ice so they don't swim as it scrolls.
  for (let y = y0 + 9; y < y1 - 3; y += 19) {
    ctx.fillRect(x + 8 + (Math.floor(y / 19) % 2) * 3, y, 6, 1);
  }
}

function drawPillar(ctx: CanvasRenderingContext2D, p: Pillar) {
  const x = Math.round(p.x);
  if (x > W + 4 || x < -PILLAR_W - 4) return;
  const gapTop = Math.round(p.gapY - p.gap / 2);
  const gapBottom = Math.round(p.gapY + p.gap / 2);

  // From the top: a block of ice ending in three icicles.
  drawIce(ctx, x, 0, gapTop - 5);
  const widths = [8, 6, 6, 4, 2];
  for (let tooth = 0; tooth < 3; tooth += 1) {
    widths.forEach((w, r) => {
      const left = x + tooth * 8 + (8 - w) / 2;
      const y = gapTop - 5 + r;
      ctx.fillStyle = INK;
      ctx.fillRect(left, y, w, 1);
      if (w > 2) {
        ctx.fillStyle = tooth === 0 ? "#F2FBFF" : tooth === 2 ? "#8FC8F0" : "#BFE6FF";
        ctx.fillRect(left + 1, y, w - 2, 1);
      }
    });
  }

  // From the sea: a block of ice with a cap of snow.
  drawIce(ctx, x, gapBottom + 5, SEA + 4);
  ctx.fillStyle = INK;
  ctx.fillRect(x - 1, gapBottom, PILLAR_W + 2, 1);
  ctx.fillRect(x - 2, gapBottom + 1, PILLAR_W + 4, 5);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x - 1, gapBottom + 1, PILLAR_W + 2, 4);
  ctx.fillStyle = "#CFE0F7";
  ctx.fillRect(x - 1, gapBottom + 4, PILLAR_W + 2, 1);
  // Two little drips under the cap.
  ctx.fillStyle = INK;
  ctx.fillRect(x + 4, gapBottom + 6, 4, 2);
  ctx.fillRect(x + 15, gapBottom + 6, 3, 1);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x + 5, gapBottom + 5, 2, 2);
}

function drawSea(ctx: CanvasRenderingContext2D, s: WingState, frame: number, night: number) {
  const top = mix("#7CC4F6", "#2E4C8F", night);
  const deep = mix("#4E9FE3", "#1F2F66", night);
  ctx.fillStyle = top;
  ctx.fillRect(0, SEA, W, H - SEA);
  ctx.fillStyle = deep;
  ctx.fillRect(0, SEA + 9, W, H - SEA - 9);
  // Rolling crest along the water line.
  const shift = Math.floor(s.travelled + frame * 0.15);
  ctx.fillStyle = "#EAF8FF";
  for (let x = -8; x < W + 8; x += 1) {
    const phase = mod(x + shift, 12);
    if (phase < 5) ctx.fillRect(x, SEA, 1, 1);
    else if (phase === 5 || phase === 11) ctx.fillRect(x, SEA + 1, 1, 1);
  }
  // Glints further down.
  for (let k = 0; k < 7; k += 1) {
    const x = mod(hash(k + 60) * (W + 20) - s.travelled * (0.6 + (k % 3) * 0.2), W + 20) - 10;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(Math.round(x), SEA + 5 + ((k * 5) % 14), 5 + (k % 3) * 2, 1);
  }
  ctx.globalAlpha = 1;
}

function drawBird(ctx: CanvasRenderingContext2D, s: WingState) {
  const art = s.sinceFlap < 5 ? BIRD_DOWN : s.sinceFlap < 10 || s.vy < 0.6 ? BIRD_MID : BIRD_UP;
  const x = BIRD_X - 9;
  const y = Math.round(s.y) - 8;
  if (!s.crashed) {
    drawSprite(ctx, art, x, y);
    return;
  }
  // Knocked out: tumbling upside down.
  ctx.save();
  ctx.translate(0, y * 2 + 16);
  ctx.scale(1, -1);
  drawSprite(ctx, BIRD_UP, x, y);
  ctx.restore();
}

export function renderWing(
  ctx: CanvasRenderingContext2D,
  s: WingState,
  frame: number,
  hud: boolean,
) {
  drawBackdrop(ctx, s, frame);
  const night = clamp01(Math.min(SKIES.length - 1, s.score / POINTS_PER_SKY) - 2);

  // Snow drifting past.
  ctx.fillStyle = "#FFFFFF";
  ctx.globalAlpha = 0.85;
  for (let k = 0; k < 22; k += 1) {
    const x = mod(hash(k + 80) * W - s.travelled * 0.5 - frame * 0.12, W);
    const y = mod(hash(k + 120) * SEA + frame * (0.22 + hash(k + 140) * 0.3), SEA);
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
  ctx.globalAlpha = 1;

  for (const p of s.pillars) drawPillar(ctx, p);

  for (const f of s.fishList) {
    if (f.taken) continue;
    const bob = Math.round(Math.sin((frame + f.x) / 12) * 2);
    drawSprite(ctx, FISH, f.x - 5, f.y - 3 + bob);
  }

  // Once in the water the penguin is drawn first, so the sea covers it as it sinks.
  if (s.splashT > 0) drawBird(ctx, s);
  drawSea(ctx, s, frame, night);
  if (s.splashT === 0) drawBird(ctx, s);

  for (const part of s.particles) {
    if (part.life <= 0) continue;
    ctx.globalAlpha = clamp01(part.life / 12);
    ctx.fillStyle = part.colour;
    ctx.fillRect(Math.round(part.x), Math.round(part.y), 2, 2);
  }
  ctx.globalAlpha = 1;

  for (const pop of s.popups) {
    if (pop.life <= 0) continue;
    ctx.globalAlpha = clamp01(pop.life / 14);
    drawText(ctx, pop.text, pop.x, pop.y, { colour: "#FFF3B0", outline: INK, align: "center" });
  }
  ctx.globalAlpha = 1;

  if (!hud) return;
  drawText(ctx, String(s.score), W / 2, 8, {
    scale: 3,
    colour: "#FFFFFF",
    outline: INK,
    align: "center",
  });
}
