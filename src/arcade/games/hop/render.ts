/** HOP UP — drawing only. Reads a HopState and paints one frame; never changes the state. */
import {
  CLOUD_BIG,
  CLOUD_SMALL,
  HEART,
  INK,
  MOON,
  SPARKLE,
  critter,
  drawSky,
  hash,
  mix,
} from "@/arcade/art";
import { drawText } from "@/arcade/engine/font";
import { drawSprite } from "@/arcade/engine/sprite";
import { H, W, ZONE_HEIGHT, valueAt, type HopState, type Platform } from "@/arcade/games/hop/logic";
import {
  PLATFORM_BISCUIT,
  PLATFORM_CLOUD,
  PLATFORM_DRIFT,
  SPRING_DOWN,
  SPRING_UP,
} from "@/arcade/games/hop/sprites";

/** Each zone is a stretch of sky. The higher the zone, the more a platform is worth. */
export const ZONES = [
  { name: "MEADOW", top: "#9CCBFF", bottom: "#E3F3FF" },
  { name: "COTTON SKY", top: "#86BEFF", bottom: "#FFE3EE" },
  { name: "SUNSET", top: "#FF9EBB", bottom: "#FFDDAE" },
  { name: "DUSK", top: "#5F4B8B", bottom: "#FFAFCC" },
  { name: "NIGHT", top: "#231A45", bottom: "#5F4B8B" },
  { name: "STARS", top: "#120E27", bottom: "#2B2052" },
] as const;

const CAT_STAND = critter("cat", "default");
const CAT_UP = critter("cat", "cheer");
const CAT_OOPS = critter("cat", "peek");

const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function zoneName(zone: number): string {
  return zone < ZONES.length ? ZONES[zone]!.name : `SKY ${zone + 1}`;
}

function drawBackdrop(ctx: CanvasRenderingContext2D, s: HopState, frame: number) {
  // Where the camera is, in zones. The sky only starts turning near the end of a zone.
  const seen = Math.max(0, -(s.camY + H * 0.46)) / ZONE_HEIGHT;
  const last = ZONES.length - 1;
  const i = Math.min(last, Math.floor(seen));
  const blend = i >= last ? 0 : clamp01((seen - i - 0.72) / 0.28);
  const a = ZONES[i]!;
  const b = ZONES[Math.min(last, i + 1)]!;
  drawSky(ctx, W, H, mix(a.top, b.top, blend), mix(a.bottom, b.bottom, blend));

  const night = clamp01((i + blend - 2.5) / 1.3);

  if (night > 0) {
    const tile = H * 2;
    ctx.globalAlpha = night;
    for (let j = 0; j < 70; j += 1) {
      const y = mod(hash(j * 2 + 2) * tile - s.camY * 0.22, tile);
      if (y >= H) continue;
      const x = Math.floor(hash(j * 2 + 1) * W);
      if ((Math.floor(frame / 16) + j) % 9 === 0) continue; // twinkle: blink off briefly
      if (j % 11 === 0) drawSprite(ctx, SPARKLE, x - 2, y - 2);
      else {
        ctx.fillStyle = j % 3 === 0 ? "#FFE9A8" : "#FFFFFF";
        ctx.fillRect(x, Math.floor(y), 1, 1);
      }
    }
    drawSprite(ctx, MOON, W - 30, 26 + Math.round(mod(-s.camY * 0.02, 12)));
    ctx.globalAlpha = 1;
  }

  // Far clouds drift slowly and scroll at half speed, which gives the feeling of height.
  const span = 7 * 64;
  ctx.globalAlpha = 0.75 - night * 0.5;
  for (let j = 0; j < 7; j += 1) {
    const y = mod(j * 64 + hash(j + 31) * 30 - s.camY * 0.5, span) - 30;
    if (y > H) continue;
    const dir = j % 2 === 0 ? 1 : -1;
    const x = mod(hash(j + 50) * (W + 40) + frame * 0.04 * dir, W + 40) - 30;
    drawSprite(ctx, j % 2 === 0 ? CLOUD_BIG : CLOUD_SMALL, x, y);
  }
  ctx.globalAlpha = 1;
}

function drawGround(ctx: CanvasRenderingContext2D, s: HopState) {
  const gy = Math.round(-s.camY);
  if (gy > H + 30) return;
  // Soft hills behind the grass.
  ctx.fillStyle = "#C6ECCB";
  for (let x = 0; x < W; x += 1) {
    const h = 15 + Math.round(9 * Math.sin(x * 0.05 + 1) + 4 * Math.sin(x * 0.13));
    ctx.fillRect(x, gy - h, 1, h);
  }
  ctx.fillStyle = "#8ED69A";
  ctx.fillRect(0, gy, W, H - gy + 40);
  ctx.fillStyle = "#B9ECC1";
  ctx.fillRect(0, gy + 1, W, 2);
  ctx.fillStyle = "#6FBF80";
  ctx.fillRect(0, gy + 11, W, 1);
  ctx.fillStyle = INK;
  ctx.fillRect(0, gy, W, 1);
  // A few flowers and grass tufts.
  for (let k = 0; k < 9; k += 1) {
    const x = Math.floor(hash(k + 200) * (W - 6)) + 3;
    if (k % 3 === 0) {
      ctx.fillStyle = "#6FBF80";
      ctx.fillRect(x, gy - 3, 1, 3);
      ctx.fillStyle = k % 2 === 0 ? "#FF8FB3" : "#FFE680";
      ctx.fillRect(x - 1, gy - 5, 3, 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x, gy - 5, 1, 1);
    } else {
      ctx.fillStyle = "#6FBF80";
      ctx.fillRect(x, gy - 2, 1, 2);
      ctx.fillRect(x + 2, gy - 3, 1, 3);
    }
  }
}

function drawPlatform(ctx: CanvasRenderingContext2D, p: Platform, camY: number) {
  const y = Math.round(p.y - camY) + (p.dipT > 4 ? 1 : 0);
  if (y < -20 || y > H + 10) return;
  if (p.broken) {
    const alpha = clamp01(1 - p.fallV / 3.5);
    if (alpha > 0) drawSprite(ctx, PLATFORM_BISCUIT, p.x, y, { alpha });
    return;
  }
  const art =
    p.kind === "drift" ? PLATFORM_DRIFT : p.kind === "biscuit" ? PLATFORM_BISCUIT : PLATFORM_CLOUD;
  drawSprite(ctx, art, p.x, y);
  if (p.spring) {
    const spring = p.springT > 8 ? SPRING_DOWN : SPRING_UP;
    drawSprite(ctx, spring, p.x + (p.w - 12) / 2, y - spring.rows.length + 1);
  }
}

function drawCat(ctx: CanvasRenderingContext2D, s: HopState, frame: number) {
  const idle = s.tick === 0;
  const art = s.falling ? CAT_OOPS : s.vy < -0.8 ? CAT_UP : CAT_STAND;
  let squash = 1;
  if (s.squashT > 0) squash = 1 - 0.2 * (s.squashT / 9);
  else if (s.vy < -3.2) squash = 1.1;
  const bob = idle && Math.floor(frame / 24) % 2 === 0 ? -1 : 0;
  const y = s.y - s.camY - 24 + bob;
  const opts = { flip: s.face < 0, squash };
  drawSprite(ctx, art, s.x - 12, y, opts);
  // Half off one edge? Draw the other half coming in on the opposite side.
  if (s.x < 12) drawSprite(ctx, art, s.x - 12 + W, y, opts);
  else if (s.x > W - 12) drawSprite(ctx, art, s.x - 12 - W, y, opts);
}

export function renderHop(ctx: CanvasRenderingContext2D, s: HopState, frame: number, hud: boolean) {
  drawBackdrop(ctx, s, frame);
  drawGround(ctx, s);

  for (const p of s.platforms) drawPlatform(ctx, p, s.camY);

  for (const h of s.heartsList) {
    if (h.taken) continue;
    const y = h.y - s.camY + Math.round(Math.sin((frame + h.x * 7) / 14) * 2);
    if (y > -12 && y < H + 4) drawSprite(ctx, HEART, h.x - 5, y - 5);
  }

  drawCat(ctx, s, frame);

  for (const part of s.particles) {
    if (part.life <= 0) continue;
    ctx.globalAlpha = clamp01(part.life / 12);
    ctx.fillStyle = part.colour;
    ctx.fillRect(Math.round(part.x), Math.round(part.y - s.camY), 2, 2);
  }
  ctx.globalAlpha = 1;

  for (const pop of s.popups) {
    if (pop.life <= 0) continue;
    ctx.globalAlpha = clamp01(pop.life / 14);
    drawText(ctx, pop.text, pop.x, pop.y - s.camY, {
      colour: "#FFF3B0",
      outline: INK,
      align: "center",
    });
  }
  ctx.globalAlpha = 1;

  if (!hud) return;
  drawText(ctx, String(s.score), W / 2, 7, {
    scale: 2,
    colour: "#FFFFFF",
    outline: INK,
    align: "center",
  });
  const each = valueAt(s.climb);
  drawText(ctx, `+${each} PER STEP`, W / 2, 21, {
    colour: "#FFF3B0",
    outline: INK,
    align: "center",
  });

  if (s.bannerT > 0) {
    const show = clamp01(Math.min(s.bannerT, 130 - s.bannerT) / 10);
    ctx.globalAlpha = show * 0.6;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 62, W, 30);
    ctx.globalAlpha = show;
    drawText(ctx, zoneName(s.zone), W / 2, 67, { scale: 2, colour: "#FFFFFF", align: "center" });
    drawText(ctx, `STEPS NOW PAY +${each}`, W / 2, 82, { colour: "#FFE680", align: "center" });
    ctx.globalAlpha = 1;
  }
}
