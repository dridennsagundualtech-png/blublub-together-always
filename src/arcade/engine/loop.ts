/** One tick of game time, in milliseconds (60 ticks per second). */
export const TICK_MS = 1000 / 60;

/** Never try to catch up more than this many ticks in one frame (e.g. after a tab switch). */
const MAX_TICKS_PER_FRAME = 5;

/**
 * Runs `tick` at a steady 60 times a second and `draw` once per screen refresh, whatever the
 * phone's refresh rate. Returns a function that stops the loop.
 */
export function startLoop(tick: () => void, draw: () => void): () => void {
  let raf = 0;
  let last = performance.now();
  let owed = 0;
  let stopped = false;

  const frame = (now: number) => {
    if (stopped) return;
    owed += Math.min(now - last, TICK_MS * MAX_TICKS_PER_FRAME);
    last = now;
    while (owed >= TICK_MS) {
      tick();
      owed -= TICK_MS;
    }
    draw();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}
