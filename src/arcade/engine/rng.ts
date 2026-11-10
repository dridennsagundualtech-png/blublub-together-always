/**
 * Small seeded random generator (mulberry32). Games use this instead of Math.random so a
 * run can be reproduced from its seed — which is what makes the rules testable.
 */
export type Rng = { seed: number };

export function makeRng(seed: number): Rng {
  return { seed: seed >>> 0 || 1 };
}

/** Next number in [0, 1). */
export function rand(rng: Rng): number {
  rng.seed = (rng.seed + 0x6d2b79f5) >>> 0;
  let t = rng.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Number in [min, max). */
export function randRange(rng: Rng, min: number, max: number): number {
  return min + rand(rng) * (max - min);
}

/** Whole number in [min, max]. */
export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(randRange(rng, min, max + 1));
}

export function chance(rng: Rng, probability: number): boolean {
  return rand(rng) < probability;
}
