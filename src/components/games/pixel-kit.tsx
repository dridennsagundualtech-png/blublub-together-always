/**
 * Shared pixel-art pieces for the two-player games. Looks only — no game rules and no data
 * access live here. The styles are in src/pixel.css (the `px-*` classes).
 */
import type { CSSProperties, ReactNode } from "react";
import { Doodle, type Critter, type Pose } from "@/components/Doodles";
import { cn } from "@/lib/utils";

/** Seat 0 (whoever started the game) is always the penguin, seat 1 the seal. */
export const SEAT_CRITTER: readonly [Critter, Critter] = ["penguin", "seal"];

/** Wraps a game so everything inside is drawn in the pixel look, in every app style. */
export function PixelStage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("pixel-zone space-y-3", className)}>{children}</div>;
}

/** The play field: a framed panel in one of the theme tints. */
export function PixelBoard({
  children,
  tint = "accent",
  className,
}: {
  children: ReactNode;
  tint?: "accent" | "primary" | "sky" | "muted" | "none";
  className?: string;
}) {
  return (
    <div className={cn("px-frame px-board", tint !== "none" && `px-tint-${tint}`, className)}>
      {children}
    </div>
  );
}

/** A row of little squares: `filled` of `total` lit. Used for round scores. */
export function Pips({ total, filled }: { total: number; filled: number }) {
  return (
    <span className="px-pips" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={cn("px-pip", i < filled && "px-pip--on")} />
      ))}
    </span>
  );
}

/**
 * The two players side by side, with the mover's plate lit and a hopping arrow above it.
 * `turn` is the id of whoever must act (null = both or nobody).
 * `scores` shows a number; `pips` shows that many squares with the score filled in.
 */
export function Versus({
  players,
  me,
  nameOf,
  turn = null,
  scores,
  pips,
  critters = SEAT_CRITTER,
  poses,
}: {
  players: [string | null, string | null];
  me: string;
  nameOf: (id: string | null | undefined) => string;
  turn?: string | null | undefined;
  scores?: readonly [number, number] | undefined;
  pips?: number | undefined;
  critters?: readonly [Critter, Critter];
  poses?: readonly [Pose, Pose] | undefined;
}) {
  const plate = (seat: 0 | 1) => {
    const id = players[seat];
    const active = turn != null && id === turn;
    const mine = id === me;
    const score = scores?.[seat];
    return (
      <div
        className={cn(
          "px-plate",
          seat === 1 && "px-plate--right",
          active ? "px-plate--active" : turn == null && "px-plate--quiet",
        )}
      >
        <span className={cn("shrink-0", active && "px-hop")}>
          <Doodle critter={critters[seat]} pose={poses?.[seat] ?? "default"} size={38} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold leading-tight">
            {mine ? "You" : nameOf(id)}
          </span>
          {pips != null && score != null ? (
            <Pips total={pips} filled={score} />
          ) : score != null ? (
            <span className="block text-xl font-bold leading-none tabular-nums">{score}</span>
          ) : (
            <span className="block text-xs capitalize leading-tight text-muted-foreground">
              {critters[seat]}
            </span>
          )}
        </span>
      </div>
    );
  };
  return (
    <div className="px-versus">
      {plate(0)}
      <span className="px-vs">VS</span>
      {plate(1)}
    </div>
  );
}

const BURST_COLOURS = ["var(--honey)", "var(--primary)", "var(--sky)", "#FFFFFF", "var(--mint)"];

/** A quick burst of pixel squares from the centre of its (relatively positioned) parent. */
export function Burst({ count = 8, spread = 34 }: { count?: number; spread?: number }) {
  return (
    <span className="px-burst" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + 0.4;
        const reach = spread * (0.7 + ((i * 37) % 10) / 20);
        return (
          <i
            key={i}
            style={
              {
                "--x": `${Math.round(Math.cos(angle) * reach)}px`,
                "--y": `${Math.round(Math.sin(angle) * reach)}px`,
                "--c": BURST_COLOURS[i % BURST_COLOURS.length],
                "--d": `${(i % 3) * 0.04}s`,
              } as CSSProperties
            }
          />
        );
      })}
    </span>
  );
}

/** Three blinking dots: "waiting for your partner". */
export function Waiting() {
  return (
    <span className="px-wait" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/** A small line of pixel text under a board. */
export function Caption({ children }: { children: ReactNode }) {
  return <p className="text-center text-sm text-muted-foreground">{children}</p>;
}
