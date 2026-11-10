// Rules of Hop Up. Run with: bun test
import { describe, expect, test } from "bun:test";
import {
  H,
  JUMP_HEIGHT,
  PLATFORM_W,
  W,
  ZONE_HEIGHT,
  createHop,
  hopDemo,
  stepHop,
  valueAt,
  type HopState,
} from "../../src/arcade/games/hop/logic";

const IDLE = { left: false, right: false, action: false };

function run(s: HopState, ticks: number, play = hopDemo) {
  for (let i = 0; i < ticks && !s.over; i += 1) stepHop(s, play(s));
  return s;
}

describe("Hop Up — world", () => {
  test("the same seed builds the same world", () => {
    const a = run(createHop(42), 600);
    const b = run(createHop(42), 600);
    expect(a.score).toBe(b.score);
    expect(a.y).toBe(b.y);
    expect(a.platforms.map((p) => [p.x, p.y, p.kind])).toEqual(
      b.platforms.map((p) => [p.x, p.y, p.kind]),
    );
  });

  test("different seeds build different worlds", () => {
    const a = createHop(1).platforms.map((p) => Math.round(p.x));
    const b = createHop(2).platforms.map((p) => Math.round(p.x));
    expect(a).not.toEqual(b);
  });

  test("every step up is within one jump, on screen, and never only a biscuit", () => {
    for (const seed of [1, 7, 99, 12345]) {
      const s = createHop(seed);
      // Build a tall stretch of world by moving the camera far up.
      s.camY = -9000;
      stepHop(s, IDLE);
      const solid = s.platforms.filter((p) => p.kind !== "biscuit").sort((p, q) => q.y - p.y);
      expect(solid.length).toBeGreaterThan(100);
      let below = 0; // the ground
      for (const p of solid) {
        expect(below - p.y).toBeLessThan(JUMP_HEIGHT - 6);
        expect(below - p.y).toBeGreaterThan(10);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x + PLATFORM_W).toBeLessThanOrEqual(W);
        below = p.y;
      }
    }
  });
});

describe("Hop Up — scoring", () => {
  test("higher zones pay more per platform", () => {
    expect(valueAt(0)).toBe(1);
    expect(valueAt(ZONE_HEIGHT - 1)).toBe(1);
    expect(valueAt(ZONE_HEIGHT)).toBe(2);
    expect(valueAt(ZONE_HEIGHT * 3 + 5)).toBe(4);
    const s = createHop(3);
    s.camY = -6000;
    stepHop(s, IDLE);
    const byHeight = [...s.platforms].sort((p, q) => q.y - p.y);
    for (let i = 1; i < byHeight.length; i += 1) {
      expect(byHeight[i]!.value).toBeGreaterThanOrEqual(byHeight[i - 1]!.value);
    }
  });

  test("a platform only scores the first time it is the highest reached", () => {
    const s = createHop(5);
    // Standing still, the cat just bounces on the ground: no platform, no points.
    run(s, 300, () => IDLE);
    expect(s.score).toBe(0);
    expect(s.over).toBe(false);
  });

  test("score never goes down and grows with height", () => {
    const s = createHop(11);
    let last = 0;
    for (let i = 0; i < 4000 && !s.over; i += 1) {
      stepHop(s, hopDemo(s));
      expect(s.score).toBeGreaterThanOrEqual(last);
      last = s.score;
    }
    expect(s.score).toBeGreaterThan(0);
  });
});

describe("Hop Up — play", () => {
  test("a heart is worth 5 points and can only be taken once", () => {
    const s = createHop(4);
    s.heartsList = [{ x: s.x, y: s.y - 9, taken: false }];
    stepHop(s, IDLE);
    expect(s.hearts).toBe(1);
    expect(s.score).toBe(5);
    run(s, 30, () => IDLE);
    expect(s.hearts).toBe(1);
    expect(s.score).toBe(5);
  });

  test("a biscuit holds one jump and then breaks", () => {
    const s = createHop(6);
    const biscuit = {
      ...s.platforms[0]!,
      kind: "biscuit" as const,
      x: s.x - 15,
      y: -20,
      vx: 0,
      n: 500,
    };
    s.platforms = [biscuit];
    run(s, 80, () => IDLE); // jump from the ground, come down onto it
    expect(biscuit.broken).toBe(true);
    expect(s.score).toBeGreaterThan(0);
  });

  test("walking off one side comes back on the other", () => {
    const s = createHop(8);
    for (let i = 0; i < 200; i += 1) {
      stepHop(s, { left: true, right: false, action: false });
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThan(W);
    }
  });

  test("falling below the screen ends the run", () => {
    const s = createHop(9);
    run(s, 2400); // climb a bit with the demo player
    expect(s.camY).toBeLessThan(-H); // the ground has scrolled away
    expect(s.over).toBe(false);
    s.platforms = []; // nothing left to land on
    run(s, 600, () => IDLE);
    expect(s.falling).toBe(true);
    expect(s.over).toBe(true);
    const frozen = s.score;
    stepHop(s, IDLE); // a finished run stays finished
    expect(s.score).toBe(frozen);
  });

  test("the demo player can climb well past the first zone on most seeds", () => {
    const heights: number[] = [];
    for (let seed = 1; seed <= 12; seed += 1) {
      const s = run(createHop(seed * 101), 60 * 90); // up to 90 seconds
      heights.push(Math.round(s.climb));
    }
    const sorted = [...heights].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    console.log("demo heights:", heights.join(" "), "median", median);
    expect(median).toBeGreaterThan(ZONE_HEIGHT);
  });
});
