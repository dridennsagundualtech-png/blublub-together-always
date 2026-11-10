/**
 * HOP UP — rules only (no drawing, no browser APIs).
 *
 * The cat bounces by itself; the player only steers left and right. Every platform that is
 * higher than any reached before pays points, and platforms pay more the higher the zone:
 * 1 point each in the first zone, 2 in the second, and so on. Falling off the bottom ends the run.
 *
 * Coordinates: x grows to the right, y grows DOWN (like the screen). The ground is y = 0, so
 * everything above it has a negative y and "climbing" means y getting smaller.
 */
import { chance, makeRng, randRange, type Rng } from "@/arcade/engine/rng";
import type { ArcadeInput, ArcadeSound } from "@/arcade/engine/types";

export const W = 144;
export const H = 224;

/** How far above the bottom of the screen the ground sits at the start. */
export const GROUND_MARGIN = 26;

export const GRAVITY = 0.19;
export const JUMP_SPEED = 4.7;
export const SPRING_SPEED = 7.6;
export const MAX_FALL = 6;
export const MOVE_ACCEL = 0.42;
export const MOVE_MAX = 2.7;
export const FRICTION = 0.82;

/** Half the width of the cat's feet — how far past a platform edge still counts as on it. */
export const FEET = 6;
export const PLATFORM_W = 30;

/** Height climbed (in game pixels) before the next zone begins. */
export const ZONE_HEIGHT = 720;
/** Apex of a normal jump: v² / 2g. Gaps must stay comfortably below this. */
export const JUMP_HEIGHT = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
const MAX_GAP = 49;
const HEART_POINTS = 5;

export type PlatformKind = "cloud" | "drift" | "biscuit";

export type Platform = {
  /** Counts up with height; reaching a bigger n than ever before is what scores. */
  n: number;
  x: number;
  y: number;
  w: number;
  kind: PlatformKind;
  /** Sideways speed for drifting platforms. */
  vx: number;
  /** Points paid when this platform is a new record. */
  value: number;
  spring: boolean;
  /** Animation timers (ticks left). */
  springT: number;
  dipT: number;
  /** A biscuit that has been stepped on: it falls away and can't be landed on again. */
  broken: boolean;
  fallV: number;
};

export type Heart = { x: number; y: number; taken: boolean };
export type Popup = { x: number; y: number; text: string; life: number };
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  colour: string;
};

export type HopState = {
  rng: Rng;
  tick: number;
  /** The cat's feet (centre). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  face: 1 | -1;
  /** World y of the top edge of the screen. Only ever moves up. */
  camY: number;
  /** Highest point reached, as a positive number of pixels above the ground. */
  climb: number;
  zone: number;
  score: number;
  hearts: number;
  bestN: number;
  nextN: number;
  /** y of the highest platform generated so far. */
  topY: number;
  /** x of the last "main path" platform, so the next one is always reachable. */
  lastX: number;
  platforms: Platform[];
  heartsList: Heart[];
  popups: Popup[];
  particles: Particle[];
  /** Ticks left of the landing squash / the zone banner. */
  squashT: number;
  bannerT: number;
  /** Falling past the bottom; the run ends a moment later. */
  falling: boolean;
  over: boolean;
  sounds: ArcadeSound[];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 0 at the ground, rising to 1 around 4,500 px up: how hard the layout is. */
export function difficulty(climb: number): number {
  return clamp(climb / 4500, 0, 1);
}

/** Points paid by a platform at this height. */
export function valueAt(climb: number): number {
  return 1 + Math.floor(Math.max(0, climb) / ZONE_HEIGHT);
}

export function createHop(seed: number): HopState {
  const s: HopState = {
    rng: makeRng(seed),
    tick: 0,
    x: W / 2,
    y: 0,
    vx: 0,
    vy: 0,
    face: 1,
    camY: GROUND_MARGIN - H,
    climb: 0,
    zone: 0,
    score: 0,
    hearts: 0,
    bestN: 0,
    nextN: 1,
    topY: 0,
    lastX: W / 2 - PLATFORM_W / 2,
    platforms: [],
    heartsList: [],
    popups: [],
    particles: [],
    squashT: 0,
    bannerT: 0,
    falling: false,
    over: false,
    sounds: [],
  };
  generate(s);
  return s;
}

function addPlatform(s: HopState, x: number, y: number, kind: PlatformKind, spring: boolean) {
  const d = difficulty(-y);
  const p: Platform = {
    n: s.nextN,
    x,
    y,
    w: PLATFORM_W,
    kind,
    vx:
      kind === "drift"
        ? (chance(s.rng, 0.5) ? 1 : -1) * randRange(s.rng, 0.45, lerp(0.7, 1.15, d))
        : 0,
    value: valueAt(-y),
    spring,
    springT: 0,
    dipT: 0,
    broken: false,
    fallV: 0,
  };
  s.nextN += 1;
  s.platforms.push(p);
  return p;
}

/** Keep the world built up to one screen above what is visible. */
function generate(s: HopState) {
  while (s.topY > s.camY - H) {
    const climb = -s.topY;
    const d = difficulty(climb);
    const gap = randRange(s.rng, lerp(24, 36, d), lerp(34, MAX_GAP, d));
    const y = s.topY - gap;

    // A crumbly biscuit halfway up, as a tempting extra step. Never the only way up.
    if (climb > 160 && gap > 30 && chance(s.rng, lerp(0.12, 0.3, d))) {
      addPlatform(s, randRange(s.rng, 4, W - PLATFORM_W - 4), s.topY - gap / 2, "biscuit", false);
    }

    // The main path: always solid, never further sideways than one jump can cover, and
    // always a real step to the side (bouncing back off the walls) so it never forms a ladder.
    const side = randRange(s.rng, 16, 62) * (chance(s.rng, 0.5) ? 1 : -1);
    const min = 4;
    const max = W - PLATFORM_W - 4;
    let x = s.lastX + side;
    if (x < min || x > max) x = s.lastX - side;
    x = clamp(x, min, max);
    const drift = climb > 260 && chance(s.rng, lerp(0.08, 0.38, d));
    const spring = !drift && climb > 120 && chance(s.rng, 0.09);
    addPlatform(s, x, y, drift ? "drift" : "cloud", spring);

    if (climb > 60 && !spring && chance(s.rng, 0.16)) {
      s.heartsList.push({ x: x + PLATFORM_W / 2, y: y - 20, taken: false });
    }

    s.lastX = x;
    s.topY = y;
  }
}

function puff(s: HopState, x: number, y: number, colour: string, count: number, spread = 1) {
  for (let i = 0; i < count; i += 1) {
    s.particles.push({
      x,
      y,
      vx: randRange(s.rng, -1, 1) * spread,
      vy: randRange(s.rng, -1.2, -0.1) * spread,
      life: 14 + Math.floor(randRange(s.rng, 0, 10)),
      colour,
    });
  }
}

function land(s: HopState, p: Platform) {
  s.y = p.y;
  s.vy = -(p.spring ? SPRING_SPEED : JUMP_SPEED);
  s.squashT = 9;
  p.dipT = 8;
  if (p.spring) {
    p.springT = 14;
    s.sounds.push("spring");
  } else {
    s.sounds.push("jump");
  }
  if (p.kind === "biscuit") {
    p.broken = true;
    s.sounds.push("crack");
    puff(s, p.x + p.w / 2, p.y + 2, "#D9A86C", 7, 1.3);
  } else {
    puff(s, s.x, p.y, "#FFFFFF", 3, 0.7);
  }
  if (p.n > s.bestN) {
    const gained = (p.n - s.bestN) * p.value;
    s.bestN = p.n;
    s.score += gained;
    s.popups.push({ x: p.x + p.w / 2, y: p.y - 8, text: `+${gained}`, life: 46 });
  }
}

export function stepHop(s: HopState, input: ArcadeInput) {
  if (s.over) return;
  s.tick += 1;

  // —— steering ——
  const steer = s.falling ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (steer !== 0) {
    s.vx = clamp(s.vx + steer * MOVE_ACCEL, -MOVE_MAX, MOVE_MAX);
    s.face = steer > 0 ? 1 : -1;
  } else {
    s.vx *= FRICTION;
    if (Math.abs(s.vx) < 0.05) s.vx = 0;
  }

  // —— platforms move first, so landing uses where they are now ——
  for (const p of s.platforms) {
    if (p.broken) {
      p.fallV = Math.min(MAX_FALL, p.fallV + GRAVITY);
      p.y += p.fallV;
      continue;
    }
    if (p.vx !== 0) {
      p.x += p.vx;
      if (p.x < 2) {
        p.x = 2;
        p.vx = Math.abs(p.vx);
      } else if (p.x + p.w > W - 2) {
        p.x = W - 2 - p.w;
        p.vx = -Math.abs(p.vx);
      }
    }
    if (p.springT > 0) p.springT -= 1;
    if (p.dipT > 0) p.dipT -= 1;
  }

  // —— the cat ——
  const prevY = s.y;
  s.vy = Math.min(MAX_FALL, s.vy + GRAVITY);
  s.x += s.vx;
  s.y += s.vy;
  if (s.x < 0)
    s.x += W; // walk off one side, come back on the other
  else if (s.x >= W) s.x -= W;
  if (s.squashT > 0) s.squashT -= 1;

  if (s.vy > 0 && !s.falling) {
    // Only ever land while moving down, and only when the feet crossed the top this tick.
    for (const p of s.platforms) {
      if (p.broken || prevY > p.y || s.y < p.y) continue;
      if (s.x + FEET > p.x && s.x - FEET < p.x + p.w) {
        land(s, p);
        break;
      }
    }
    // The starting ground, for as long as it is still on screen.
    if (s.vy > 0 && s.y >= 0 && s.camY + H > 0) {
      s.y = 0;
      s.vy = -JUMP_SPEED;
      s.squashT = 9;
      s.sounds.push("jump");
    }
  }

  // —— hearts ——
  for (const h of s.heartsList) {
    if (h.taken) continue;
    if (Math.abs(h.x - s.x) < 10 && Math.abs(h.y - (s.y - 9)) < 12) {
      h.taken = true;
      s.hearts += 1;
      s.score += HEART_POINTS;
      s.sounds.push("coin");
      s.popups.push({ x: h.x, y: h.y - 6, text: `+${HEART_POINTS}`, life: 46 });
      puff(s, h.x, h.y, "#FF8FB3", 6, 1.1);
    }
  }

  // —— camera and progress ——
  const wanted = s.y - H * 0.46;
  if (wanted < s.camY) s.camY = wanted;
  if (-s.y > s.climb) s.climb = -s.y;
  const zone = Math.floor(s.climb / ZONE_HEIGHT);
  if (zone > s.zone) {
    s.zone = zone;
    s.bannerT = 130;
    s.sounds.push("point");
  }
  if (s.bannerT > 0) s.bannerT -= 1;

  // —— falling out of the picture ——
  if (!s.falling && s.y - s.camY > H + 4) {
    s.falling = true;
    s.sounds.push("fall");
  }
  if (s.falling && s.y - s.camY > H + 70) s.over = true;

  // —— small stuff ——
  for (const pop of s.popups) {
    pop.life -= 1;
    pop.y -= 0.35;
  }
  for (const part of s.particles) {
    part.life -= 1;
    part.x += part.vx;
    part.y += part.vy;
    part.vy += 0.06;
  }
  if (s.tick % 20 === 0) {
    const bottom = s.camY + H + 48;
    s.platforms = s.platforms.filter((p) => p.y < bottom);
    s.heartsList = s.heartsList.filter((h) => !h.taken && h.y < bottom);
    s.popups = s.popups.filter((p) => p.life > 0);
    s.particles = s.particles.filter((p) => p.life > 0);
  }

  generate(s);
}

/**
 * A simple computer player: while rising it aims for the highest platform it can still come
 * down onto, while falling it aims for the nearest one below. Good, not perfect.
 */
export function hopDemo(s: HopState): ArcadeInput {
  const rising = s.vy < 0;
  const apexY = rising ? s.y - (s.vy * s.vy) / (2 * GRAVITY) : s.y;
  let target: Platform | null = null;
  let bestRank = Infinity;
  for (const p of s.platforms) {
    if (p.broken || p.y < apexY + 5) continue; // too high to land on from this jump
    const centre = p.x + p.w / 2;
    const dx = Math.abs(centre - s.x);
    const side = Math.min(dx, W - dx);
    // Don't chase something the remaining air time can't reach.
    const drop = p.y - apexY;
    const air = (rising ? -s.vy / GRAVITY : 0) + Math.sqrt((2 * drop) / GRAVITY);
    if (side > air * MOVE_MAX * 0.8) continue;
    // Rising: highest first (smallest y). Falling: nearest below first.
    const rank = rising ? p.y + side * 0.2 : p.y < s.y - 2 ? Infinity : p.y - s.y + side * 0.6;
    if (rank < bestRank) {
      bestRank = rank;
      target = p;
    }
  }
  if (!target) return { left: false, right: false, action: false };
  const centre = target.x + target.w / 2 + target.vx * 6;
  let dx = centre - s.x;
  if (dx > W / 2) dx -= W;
  else if (dx < -W / 2) dx += W;
  // Coast the last few pixels so it doesn't overshoot.
  const stopping = Math.abs(s.vx) * 3;
  return { left: dx < -3 - stopping, right: dx > 3 + stopping, action: false };
}

/** Height climbed, in "metres" for the game-over screen (10 game pixels = 1 m). */
export function metres(s: HopState): number {
  return Math.floor(s.climb / 10);
}
