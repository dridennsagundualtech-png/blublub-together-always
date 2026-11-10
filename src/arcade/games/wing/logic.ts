/**
 * WING IT — rules only (no drawing, no browser APIs).
 *
 * The penguin always falls; every tap is one flap upwards. Ice pillars slide in from the
 * right with a gap to fly through: +1 for each pillar passed, +3 for each fish caught.
 * Touching a pillar or the sea ends the run.
 *
 * Coordinates: x grows to the right, y grows DOWN (like the screen).
 */
import { chance, makeRng, randRange, type Rng } from "@/arcade/engine/rng";
import type { ArcadeInput, ArcadeSound } from "@/arcade/engine/types";

export const W = 144;
export const H = 224;

/** y of the water line. Anything below it is sea. */
export const SEA = H - 22;
/** The penguin never moves sideways; the world scrolls past it. */
export const BIRD_X = 44;
/** Half-size of the penguin's hit box — a little smaller than the drawing, to be kind. */
export const BIRD_RX = 6;
export const BIRD_RY = 5;

export const GRAVITY = 0.17;
/** Upward speed of one flap. It lifts the penguin about 21 px — well under the smallest gap. */
export const FLAP_SPEED = 2.7;
export const MAX_FALL = 4.2;

export const PILLAR_W = 24;
/** Distance from one pillar to the next. */
export const SPACING = 90;
export const FIRST_PILLAR_X = W + 70;
/** The most one gap can sit above or below the one before it. */
export const MAX_STEP = 46;
const FISH_POINTS = 3;

export type Pillar = {
  x: number;
  /** Centre and height of the gap. */
  gapY: number;
  gap: number;
  passed: boolean;
};

export type Fish = { x: number; y: number; taken: boolean };
export type Popup = { x: number; y: number; text: string; life: number };
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  colour: string;
};

export type WingState = {
  rng: Rng;
  tick: number;
  y: number;
  vy: number;
  /** Ticks since the last flap (drives the wing animation). */
  sinceFlap: number;
  score: number;
  /** Pillars flown past (1 point each) and fish caught (3 points each). */
  passed: number;
  fishCaught: number;
  /** Total distance scrolled, for the background layers. */
  travelled: number;
  pillars: Pillar[];
  fishList: Fish[];
  popups: Popup[];
  particles: Particle[];
  /** Hit something: no more control, falling into the sea. */
  crashed: boolean;
  /** Ticks since the splash (0 = not in the water yet). */
  splashT: number;
  over: boolean;
  sounds: ArcadeSound[];
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The world speeds up a little as the score grows, then levels off. */
export function speedAt(score: number): number {
  return 1.15 + Math.min(0.55, score * 0.012);
}

/** The gap narrows as the score grows, down to a fair minimum. */
export function gapAt(score: number): number {
  return Math.max(52, 70 - score * 0.45);
}

function addPillar(s: WingState, x: number) {
  // The score the player will have on reaching this pillar: now, plus the pillars still ahead.
  const gap = gapAt(s.score + s.pillars.filter((p) => !p.passed).length);
  const lo = gap / 2 + 20;
  const hi = SEA - gap / 2 - 18;
  const prev = s.pillars[s.pillars.length - 1];
  // Never ask for a bigger climb or dive than the penguin can make between two pillars.
  const centre = prev
    ? clamp(prev.gapY + randRange(s.rng, -MAX_STEP, MAX_STEP), lo, hi)
    : randRange(s.rng, lo + 20, hi - 20);
  s.pillars.push({ x, gapY: centre, gap, passed: false });
  if (prev && chance(s.rng, 0.4)) {
    // A fish halfway to this pillar, on the line between the two gaps (give or take).
    s.fishList.push({
      x: x - SPACING / 2 + PILLAR_W / 2,
      y: clamp((prev.gapY + centre) / 2 + randRange(s.rng, -12, 12), 24, SEA - 22),
      taken: false,
    });
  }
}

export function createWing(seed: number): WingState {
  const s: WingState = {
    rng: makeRng(seed),
    tick: 0,
    y: H * 0.4,
    vy: 0,
    sinceFlap: 99,
    score: 0,
    passed: 0,
    fishCaught: 0,
    travelled: 0,
    pillars: [],
    fishList: [],
    popups: [],
    particles: [],
    crashed: false,
    splashT: 0,
    over: false,
    sounds: [],
  };
  for (let x = FIRST_PILLAR_X; x < FIRST_PILLAR_X + SPACING * 3; x += SPACING) addPillar(s, x);
  return s;
}

function burst(s: WingState, x: number, y: number, colour: string, count: number, up = false) {
  for (let i = 0; i < count; i += 1) {
    s.particles.push({
      x,
      y,
      vx: randRange(s.rng, -1.3, 1.3),
      vy: up ? randRange(s.rng, -2.6, -0.8) : randRange(s.rng, -1.2, 1.2),
      life: 16 + Math.floor(randRange(s.rng, 0, 12)),
      colour,
    });
  }
}

/** Is the penguin's hit box inside a pillar (above or below its gap)? */
export function hitsPillar(y: number, p: Pillar): boolean {
  if (BIRD_X + BIRD_RX <= p.x || BIRD_X - BIRD_RX >= p.x + PILLAR_W) return false;
  return y - BIRD_RY < p.gapY - p.gap / 2 || y + BIRD_RY > p.gapY + p.gap / 2;
}

export function stepWing(s: WingState, input: ArcadeInput) {
  if (s.over) return;
  s.tick += 1;
  s.sinceFlap += 1;

  // —— the penguin ——
  if (input.action && !s.crashed) {
    s.vy = -FLAP_SPEED;
    s.sinceFlap = 0;
    s.sounds.push("flap");
  }
  s.vy = Math.min(MAX_FALL, s.vy + GRAVITY);
  s.y += s.vy;
  if (s.y < BIRD_RY + 2) {
    // The top of the sky is a soft ceiling, not a wall.
    s.y = BIRD_RY + 2;
    if (s.vy < 0) s.vy = 0;
  }

  // —— the world slides left (it stops once the penguin has crashed) ——
  if (!s.crashed) {
    const speed = speedAt(s.score);
    s.travelled += speed;
    for (const p of s.pillars) p.x -= speed;
    for (const f of s.fishList) f.x -= speed;

    for (const p of s.pillars) {
      if (!p.passed && p.x + PILLAR_W < BIRD_X - BIRD_RX) {
        p.passed = true;
        s.passed += 1;
        s.score += 1;
        s.sounds.push("point");
      }
      if (hitsPillar(s.y, p)) {
        s.crashed = true;
        s.vy = -1.6; // a little bounce off the ice before the fall
        s.sounds.push("hit");
        burst(s, BIRD_X + 4, s.y, "#EAF8FF", 8);
        break;
      }
    }

    for (const f of s.fishList) {
      if (f.taken) continue;
      if (Math.abs(f.x - BIRD_X) < 10 && Math.abs(f.y - s.y) < 10) {
        f.taken = true;
        s.fishCaught += 1;
        s.score += FISH_POINTS;
        s.sounds.push("coin");
        s.popups.push({ x: f.x, y: f.y - 8, text: `+${FISH_POINTS}`, life: 44 });
        burst(s, f.x, f.y, "#FFE680", 6);
      }
    }

    // Recycle pillars that have left the screen and keep three ahead.
    const last = s.pillars[s.pillars.length - 1]!;
    if (last.x < W + SPACING) addPillar(s, last.x + SPACING);
    if (s.pillars[0]!.x < -PILLAR_W - 8) s.pillars.shift();
    if (s.fishList.length && s.fishList[0]!.x < -12) s.fishList.shift();
  }

  // —— the sea ——
  if (s.splashT === 0 && s.y + BIRD_RY >= SEA) {
    s.splashT = 1;
    if (!s.crashed) s.sounds.push("hit");
    s.crashed = true;
    s.sounds.push("fall");
    burst(s, BIRD_X, SEA, "#EAF8FF", 12, true);
  } else if (s.splashT > 0) {
    s.splashT += 1;
    s.vy = Math.min(s.vy, 0.6); // sinking slowly
    if (s.splashT > 42) s.over = true;
  }

  // —— small stuff ——
  for (const pop of s.popups) {
    pop.life -= 1;
    pop.y -= 0.35;
  }
  for (const part of s.particles) {
    part.life -= 1;
    part.x += part.vx;
    part.y += part.vy;
    part.vy += 0.09;
  }
  if (s.tick % 20 === 0) {
    s.popups = s.popups.filter((p) => p.life > 0);
    s.particles = s.particles.filter((p) => p.life > 0);
  }
}

/**
 * A simple computer player. A flap always lifts the penguin by the same amount, so it flies
 * along the bottom of the safe part of the next gap and flaps each time it sinks to that line —
 * no faster than a person could tap.
 */
export function wingDemo(s: WingState): ArcadeInput {
  const next = s.pillars.find((p) => p.x + PILLAR_W > BIRD_X - BIRD_RX);
  const line = next ? next.gapY + next.gap / 2 - BIRD_RY - 6 : H * 0.42;
  const flap = !s.crashed && s.sinceFlap >= 7 && s.y + s.vy >= line;
  return { left: false, right: false, action: flap };
}
