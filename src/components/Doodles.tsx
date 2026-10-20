import { memo } from "react";
import { cn } from "@/lib/utils";
import { OVERLAY_PALETTE, PALETTES, SPRITES } from "@/components/pixel-critters";

export type Critter = keyof typeof SPRITES;
export type Pose = keyof (typeof SPRITES)["cat"];

const POSES: Pose[] = ["default", "wave", "peek", "sleep", "curious", "love", "cheer"];
const CRITTERS: Critter[] = ["cat", "seal", "penguin"];

/**
 * Intentional pose per screen: the expression should echo what the screen is for.
 * Keys are matched as lowercase substrings of the screen title/context.
 */
const CONTEXT_POSES: [string, Pose][] = [
  ["cycle", "sleep"],
  ["period", "sleep"],
  ["cool-down", "sleep"],
  ["memory book", "love"],
  ["daily question", "curious"],
  ["question", "curious"],
  ["food", "curious"],
  ["bucket", "cheer"],
  ["games", "cheer"],
  ["game", "cheer"],
  ["chat", "wave"],
  ["profile", "wave"],
  ["diary", "love"],
  ["timeline", "default"],
  ["photos", "love"],
  ["memories", "love"],
  ["date night", "love"],
  ["calendar", "peek"],
  ["budget", "peek"],
  ["to-dos", "cheer"],
  ["more", "peek"],
  ["18+", "peek"],
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 100_000;
  return h;
}

/** Deterministic pose for a given context string, so each screen keeps a stable look. */
export function poseFor(seed: string): Pose {
  const key = seed.toLowerCase();
  const match = CONTEXT_POSES.find(([needle]) => key.includes(needle));
  if (match) return match[1];
  return POSES[hash(seed) % POSES.length]!;
}

/**
 * Explicit critter per screen so neighbouring screens never share the same animal.
 * Anything unlisted falls back to a deterministic pick.
 */
const CONTEXT_CRITTERS: [string, Critter][] = [
  ["games", "seal"],
  ["game", "seal"],
  ["chat", "penguin"],
  ["profile", "seal"],
  ["photos", "penguin"],
  ["memories", "cat"],
  ["memory book", "cat"],
  ["diary", "seal"],
  ["timeline", "penguin"],
  ["calendar", "cat"],
  ["budget", "penguin"],
  ["to-dos", "cat"],
  ["bucket", "seal"],
  ["food", "cat"],
  ["daily question", "penguin"],
  ["question", "penguin"],
  ["cycle", "seal"],
  ["period", "seal"],
  ["cool-down", "penguin"],
  ["date night", "cat"],
  ["more", "seal"],
  ["18+", "cat"],
];

/** Deterministic critter for a context string, so screens rotate through all three. */
export function critterFor(seed: string): Critter {
  const key = seed.toLowerCase();
  const match = CONTEXT_CRITTERS.find(([needle]) => key.includes(needle));
  if (match) return match[1];
  return CRITTERS[hash(`${seed}~critter`) % CRITTERS.length]!;
}



/** One <rect> per horizontal run of same-coloured pixels. */
function runs(critter: Critter, pose: Pose) {
  const palette: Record<string, string> = { ...PALETTES[critter], ...OVERLAY_PALETTE };
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  SPRITES[critter][pose].forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      let w = 1;
      while (row[x + w] === ch) w += 1;
      if (ch !== ".") rects.push({ x, y, w, fill: palette[ch] ?? "transparent" });
      x += w;
    }
  });
  return rects;
}

/** A small decorative pixel critter. Purely ornamental. */
export const Doodle = memo(function Doodle({
  critter,
  pose = "default",
  className,
  size = 56,
}: {
  critter: Critter;
  pose?: Pose;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      className={cn("pointer-events-none shrink-0 select-none", className)}
    >
      {runs(critter, pose).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
});
