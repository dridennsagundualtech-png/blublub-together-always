import catImg from "@/assets/cat.png";
import catSleep from "@/assets/cat-sleep.png";
import catWave from "@/assets/cat-wave.png";
import catPeek from "@/assets/cat-peek.png";
import catLove from "@/assets/cat-love.png";
import catCheer from "@/assets/cat-cheer.png";
import sealImg from "@/assets/seal.png";
import sealSleep from "@/assets/seal-sleep.png";
import sealWave from "@/assets/seal-wave.png";
import sealPeek from "@/assets/seal-peek.png";
import sealLove from "@/assets/seal-love.png";
import sealCheer from "@/assets/seal-cheer.png";
import penguinImg from "@/assets/penguin.png";
import penguinSleep from "@/assets/penguin-sleep.png";
import penguinWave from "@/assets/penguin-wave.png";
import penguinCurious from "@/assets/penguin-curious.png";
import penguinLove from "@/assets/penguin-love.png";
import penguinCheer from "@/assets/penguin-cheer.png";
import { cn } from "@/lib/utils";

const SOURCES = {
  cat: {
    default: catImg,
    sleep: catSleep,
    wave: catWave,
    peek: catPeek,
    curious: catPeek,
    love: catLove,
    cheer: catCheer,
  },
  seal: {
    default: sealImg,
    sleep: sealSleep,
    wave: sealWave,
    peek: sealPeek,
    curious: sealPeek,
    love: sealLove,
    cheer: sealCheer,
  },
  penguin: {
    default: penguinImg,
    sleep: penguinSleep,
    wave: penguinWave,
    peek: penguinCurious,
    curious: penguinCurious,
    love: penguinLove,
    cheer: penguinCheer,
  },
} as const;

export type Critter = keyof typeof SOURCES;
export type Pose = keyof (typeof SOURCES)["cat"];

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



/** A small decorative critter illustration. Purely ornamental. */
export function Doodle({
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
    <img
      src={SOURCES[critter][pose] ?? SOURCES[critter].default}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("pointer-events-none select-none", className)}
    />
  );
}
