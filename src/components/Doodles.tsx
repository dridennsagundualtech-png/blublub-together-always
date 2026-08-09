import catImg from "@/assets/cat.png";
import sealImg from "@/assets/seal.png";
import penguinImg from "@/assets/penguin.png";
import { cn } from "@/lib/utils";

const SOURCES = { cat: catImg, seal: sealImg, penguin: penguinImg } as const;

export type Critter = keyof typeof SOURCES;

/** A small decorative critter illustration. Purely ornamental. */
export function Doodle({
  critter,
  className,
  size = 56,
}: {
  critter: Critter;
  className?: string;
  size?: number;
}) {
  return (
    <img
      src={SOURCES[critter]}
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
