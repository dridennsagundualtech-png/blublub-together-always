// Rules of Wing It. Run with: bun test
import { describe, expect, test } from "bun:test";
import {
  BIRD_RY,
  BIRD_X,
  H,
  MAX_STEP,
  PILLAR_W,
  SEA,
  createWing,
  gapAt,
  hitsPillar,
  speedAt,
  stepWing,
  wingDemo,
  type WingState,
} from "../../src/arcade/games/wing/logic";

const IDLE = { left: false, right: false, action: false };
const FLAP = { left: false, right: false, action: true };

function run(s: WingState, ticks: number, play = wingDemo) {
  for (let i = 0; i < ticks && !s.over; i += 1) stepWing(s, play(s));
  return s;
}

describe("Wing It — world", () => {
  test("the same seed builds the same run", () => {
    const a = run(createWing(77), 900);
    const b = run(createWing(77), 900);
    expect(a.score).toBe(b.score);
    expect(a.y).toBe(b.y);
    expect(a.pillars.map((p) => p.gapY)).toEqual(b.pillars.map((p) => p.gapY));
  });

  test("gaps always fit on screen and are never further apart than the penguin can fly", () => {
    for (const seed of [1, 2, 3, 500]) {
      const s = createWing(seed);
      let prev: number | null = null;
      const seen = new Set<object>();
      for (let i = 0; i < 60 * 120 && !s.over; i += 1) {
        stepWing(s, wingDemo(s));
        for (const p of s.pillars) {
          if (seen.has(p)) continue;
          seen.add(p);
          expect(p.gapY - p.gap / 2).toBeGreaterThanOrEqual(18);
          expect(p.gapY + p.gap / 2).toBeLessThanOrEqual(SEA - 16);
          if (prev != null) expect(Math.abs(p.gapY - prev)).toBeLessThanOrEqual(MAX_STEP);
          prev = p.gapY;
        }
      }
      expect(seen.size).toBeGreaterThan(10);
    }
  });

  test("it gets harder slowly, then levels off", () => {
    expect(gapAt(0)).toBeGreaterThan(gapAt(20));
    expect(gapAt(1000)).toBe(52);
    expect(speedAt(20)).toBeGreaterThan(speedAt(0));
    expect(speedAt(1000)).toBe(speedAt(2000));
    // There is always room for the penguin (10 px tall) with space to spare.
    expect(gapAt(1000)).toBeGreaterThan(BIRD_RY * 2 + 30);
  });
});

describe("Wing It — play", () => {
  test("a flap lifts the penguin, gravity brings it back", () => {
    const s = createWing(5);
    const start = s.y;
    stepWing(s, FLAP);
    expect(s.vy).toBeLessThan(0);
    run(s, 8, () => IDLE);
    expect(s.y).toBeLessThan(start);
    run(s, 60, () => IDLE);
    expect(s.y).toBeGreaterThan(start);
  });

  test("the top of the sky is a soft ceiling", () => {
    const s = createWing(6);
    for (let i = 0; i < 80; i += 1) stepWing(s, FLAP);
    expect(s.y).toBeGreaterThanOrEqual(BIRD_RY);
    expect(s.over).toBe(false);
    expect(s.crashed).toBe(false);
  });

  test("doing nothing ends in the sea", () => {
    const s = run(createWing(7), 600, () => IDLE);
    expect(s.crashed).toBe(true);
    expect(s.over).toBe(true);
    expect(s.score).toBe(0);
    expect(s.y).toBeGreaterThan(H / 2);
    const before = s.tick;
    stepWing(s, FLAP); // a finished run stays finished
    expect(s.tick).toBe(before);
  });

  test("touching a pillar is a crash; the gap is safe", () => {
    const pillar = { x: BIRD_X - PILLAR_W / 2, gapY: 100, gap: 60, passed: false };
    expect(hitsPillar(100, pillar)).toBe(false);
    expect(hitsPillar(100 - 30 + BIRD_RY, pillar)).toBe(false);
    expect(hitsPillar(60, pillar)).toBe(true);
    expect(hitsPillar(140, pillar)).toBe(true);
    // A pillar that is not at the penguin yet can't be hit, whatever the height.
    expect(hitsPillar(10, { ...pillar, x: BIRD_X + 40 })).toBe(false);
  });

  test("each pillar passed is one point; a fish is three", () => {
    const s = createWing(8);
    run(s, 60 * 20);
    expect(s.over).toBe(false);
    expect(s.passed).toBeGreaterThan(5);
    expect(s.score).toBe(s.passed + s.fishCaught * 3);

    const t = createWing(9);
    t.fishList = [{ x: BIRD_X, y: t.y, taken: false }];
    stepWing(t, IDLE);
    expect(t.fishCaught).toBe(1);
    expect(t.score).toBe(3);
  });

  test("the demo player gets through plenty of pillars", () => {
    const scores: number[] = [];
    for (let seed = 1; seed <= 12; seed += 1) {
      scores.push(run(createWing(seed * 37), 60 * 90).score);
    }
    const sorted = [...scores].sort((a, b) => a - b);
    console.log("demo scores:", scores.join(" "));
    expect(sorted[Math.floor(sorted.length / 2)]!).toBeGreaterThan(15);
  });
});
