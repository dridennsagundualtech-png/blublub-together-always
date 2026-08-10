import catImg from "@/assets/cat.png";
import catSleep from "@/assets/cat-sleep.png";
import catWave from "@/assets/cat-wave.png";
import catPeek from "@/assets/cat-peek.png";
import sealImg from "@/assets/seal.png";
import sealSleep from "@/assets/seal-sleep.png";
import sealWave from "@/assets/seal-wave.png";
import sealPeek from "@/assets/seal-peek.png";
import penguinImg from "@/assets/penguin.png";
import penguinSleep from "@/assets/penguin-sleep.png";
import penguinWave from "@/assets/penguin-wave.png";
import penguinCurious from "@/assets/penguin-curious.png";
import { cn } from "@/lib/utils";

const SOURCES = {
  cat: { default: catImg, sleep: catSleep, wave: catWave, peek: catPeek, curious: catPeek },
  seal: { default: sealImg, sleep: sealSleep, wave: sealWave, peek: sealPeek, curious: sealPeek },
  penguin: {
    default: penguinImg,
    sleep: penguinSleep,
    wave: penguinWave,
    peek: penguinCurious,
    curious: penguinCurious,
  },
} as const;

export type Critter = keyof typeof SOURCES;
export type Pose = keyof (typeof SOURCES)["cat"];

const POSES: Pose[] = ["default", "wave", "peek", "sleep", "curious"];

/**
 * Intentional pose per screen: the expression should echo what the screen is for.
 * Keys are matched as lowercase substrings of the screen title/context.
 */
const CONTEXT_POSES: [string, Pose][] = [
  ["cycle", "sleep"],
  ["period", "sleep"],
  ["cool-down", "sleep"],
  ["memory book", "sleep"],
  ["daily question", "curious"],
  ["question", "curious"],
  ["food", "curious"],
  ["bucket", "curious"],
  ["games", "wave"],
  ["game", "wave"],
  ["chat", "wave"],
  ["profile", "wave"],
  ["diary", "default"],
  ["timeline", "default"],
  ["photos", "default"],
  ["date night", "default"],
  ["calendar", "peek"],
  ["budget", "peek"],
  ["to-dos", "peek"],
  ["more", "peek"],
  ["18+", "peek"],
];

/** Deterministic pose for a given context string, so each screen keeps a stable look. */
export function poseFor(seed: string): Pose {
  const key = seed.toLowerCase();
  const match = CONTEXT_POSES.find(([needle]) => key.includes(needle));
  if (match) return match[1];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 100_000;
  return POSES[h % POSES.length]!;
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
