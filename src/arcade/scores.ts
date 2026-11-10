/**
 * Best scores for the solo arcade games.
 *
 * Stored on this device only (localStorage) — deliberately NOT in the database, so the
 * arcade works signed out and adds nothing to the backend. Clearing browser data clears them.
 */
const KEY = (gameId: string) => `blublub:arcade:best:${gameId}`;

export function loadBest(gameId: string): number {
  try {
    const raw = window.localStorage.getItem(KEY(gameId));
    const n = raw == null ? 0 : Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0; // storage blocked (private mode…) — play on without a saved best
  }
}

/** Saves `score` if it beats the stored best. Returns the best after saving. */
export function saveBest(gameId: string, score: number): number {
  const best = loadBest(gameId);
  if (!(score > best)) return best;
  try {
    window.localStorage.setItem(KEY(gameId), String(Math.floor(score)));
  } catch {
    /* storage blocked — the score still shows for this visit */
  }
  return Math.floor(score);
}
