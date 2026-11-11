import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { PixelEmoji } from "@/components/pixel-art";
import { Burst } from "@/components/games/pixel-kit";
import { playChirp } from "@/hooks/use-sound";
import { cn } from "@/lib/utils";

/** One reel: a title and the options it can land on. `tone` is one of the `tile-*` colours. */
export type ReelDef = { label: string; sides: string[]; tone: string };

/** Height of one symbol on a reel, in px. The window shows three: above, the result, below. */
const CELL = 60;
/** The strip repeats the options this many times so a spin can run through several turns. */
const TURNS = 8;
const FIRST_STOP_MS = 1100;
const NEXT_STOP_MS = 450;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * A "wild" option leaves the choice to a person (e.g. "Wild — you pick"): any option whose
 * text starts with the word Wild. When a reel lands on one, the result offers that reel's
 * other options as buttons, so the choice made is recorded on the ticket.
 */
const isWild = (option: string) => /^wild\b/i.test(option.trim());

/** Where the strip sits (px) so that item `index` of the strip is on the middle row. */
const offsetFor = (index: number) => -(index - 1) * CELL;

/**
 * A pixel slot machine: one reel per list of options. Pull the lever (or press the button),
 * the reels spin and stop one after another, and the middle row is the result.
 * Optionally shows a round timer underneath.
 */
export function SlotMachine({
  reels,
  withTimer = false,
  cta = "Spin",
  footnote,
}: {
  reels: ReelDef[];
  withTimer?: boolean;
  cta?: string;
  footnote?: string;
}) {
  /** The option on the middle row of each reel. */
  const [shown, setShown] = useState<number[]>(() => reels.map(() => 0));
  /** null until the first spin; then true once that reel has stopped. */
  const [stopped, setStopped] = useState<boolean[] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [pulls, setPulls] = useState(0);
  /** For reels that landed on a wild: which option was chosen (reel number → option number). */
  const [wildPicks, setWildPicks] = useState<Record<number, number>>({});
  const strips = useRef<(HTMLDivElement | null)[]>([]);
  const running = useRef<Animation[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pendingTimers = timers.current;
    const pendingAnimations = running.current;
    return () => {
      pendingTimers.forEach((id) => window.clearTimeout(id));
      pendingAnimations.forEach((a) => a.cancel());
    };
  }, []);

  /** A reel at rest sits near the END of its strip, so a spin has room to run downwards. */
  const restIndex = (reel: number, option: number) =>
    reels[reel]!.sides.length * (TURNS - 2) + option;

  function finish() {
    setSpinning(false);
    navigator.vibrate?.(25);
    playChirp("win");
  }

  function spin() {
    if (spinning) return;
    playChirp("pop");
    setPulls((n) => n + 1);
    setWildPicks({}); // a new spin starts with nothing chosen
    const next = reels.map((r) => Math.floor(Math.random() * r.sides.length));

    if (reducedMotion()) {
      setShown(next);
      setStopped(reels.map(() => true));
      playChirp("success");
      return;
    }

    setSpinning(true);
    setStopped(reels.map(() => false));

    // A soft ticking while the reels turn.
    const tick = window.setInterval(() => playChirp("tick"), 130);

    reels.forEach((reel, i) => {
      const el = strips.current[i];
      const from = offsetFor(restIndex(i, shown[i] ?? 0));
      // Land in the first turns of the strip: symbols travel DOWN, like a real machine.
      const to = offsetFor(reel.sides.length + next[i]!);
      const duration = FIRST_STOP_MS + i * NEXT_STOP_MS;
      const land = () => {
        // Put the reel back near the end of its strip, showing the same symbol, for next time.
        if (el) el.style.transform = `translateY(${offsetFor(restIndex(i, next[i]!))}px)`;
        setShown((prev) => prev.map((v, k) => (k === i ? next[i]! : v)));
        setStopped((prev) => (prev ?? []).map((v, k) => (k === i ? true : v)));
        if (i === reels.length - 1) {
          window.clearInterval(tick);
          finish();
        } else {
          playChirp("pop");
        }
      };
      if (!el?.animate) {
        timers.current.push(window.setTimeout(land, duration));
        return;
      }
      const animation = el.animate(
        [
          { transform: `translateY(${from}px)` },
          // Overshoot by a sliver, then settle: the little bounce of a reel locking in.
          { transform: `translateY(${to + CELL * 0.16}px)`, offset: 0.9 },
          { transform: `translateY(${to}px)` },
        ],
        { duration, easing: "cubic-bezier(0.2, 0.6, 0.25, 1)", fill: "forwards" },
      );
      running.current.push(animation);
      animation.onfinish = () => {
        land();
        animation.cancel();
        running.current = running.current.filter((a) => a !== animation);
      };
    });
    timers.current.push(window.setTimeout(() => window.clearInterval(tick), 6000));
  }

  const done = !!stopped && stopped.every(Boolean) && !spinning;

  return (
    <div className="space-y-3 text-center">
      <div className={cn("px-frame slot-cabinet", spinning && "slot-cabinet--spinning")}>
        <div className="slot-marquee">
          <Bulbs />
          <span className="inline-flex items-center gap-1.5 text-sm font-bold tracking-wide">
            <PixelEmoji name="heart" size={14} />
            LUCKY SPIN
            <PixelEmoji name="heart" size={14} />
          </span>
          <Bulbs />
        </div>

        <div className="slot-body" style={{ "--cell": `${CELL}px` } as CSSProperties}>
          <div
            className="slot-reels"
            style={{ gridTemplateColumns: `repeat(${reels.length}, minmax(0, 1fr))` }}
          >
            {reels.map((reel, i) => {
              const n = reel.sides.length;
              const isStopped = stopped?.[i] ?? false;
              return (
                <div key={reel.label} className="min-w-0">
                  <p className="px-label mb-1 flex min-h-8 items-end justify-center text-[0.7rem] leading-tight">
                    {reel.label}
                  </p>
                  <div
                    className={cn(
                      "slot-window",
                      reel.tone,
                      isStopped && done && "slot-window--win",
                    )}
                  >
                    <div
                      className="slot-strip"
                      ref={(el) => {
                        strips.current[i] = el;
                      }}
                      style={{
                        transform: `translateY(${offsetFor(restIndex(i, shown[i] ?? 0))}px)`,
                      }}
                      aria-hidden="true"
                    >
                      {Array.from({ length: n * TURNS }, (_, k) => (
                        <div key={k} className="slot-cell">
                          {reel.sides[k % n]}
                        </div>
                      ))}
                    </div>
                    <span className="slot-payline" aria-hidden="true" />
                    {/* Before the first spin the result row is covered, so nothing reads as a result. */}
                    {stopped === null ? (
                      <span className="slot-cover" aria-hidden="true">
                        ?
                      </span>
                    ) : null}
                  </div>
                  <i
                    className={cn(
                      "slot-lamp",
                      isStopped && "slot-lamp--on",
                      // A wild that is still waiting for a choice keeps its lamp blinking.
                      done &&
                        isWild(reel.sides[shown[i] ?? 0] ?? "") &&
                        wildPicks[i] == null &&
                        "px-blink",
                    )}
                    aria-hidden="true"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            key={pulls}
            className={cn("slot-lever", pulls > 0 && "slot-lever--pulled")}
            onClick={spin}
            disabled={spinning}
            aria-label="Pull the lever"
          >
            <i className="slot-lever-rod" />
            <i className="slot-lever-ball" />
            <i className="slot-lever-base" />
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {done
          ? reels
              .map((r, i) => {
                const landed = r.sides[shown[i] ?? 0];
                const pick = wildPicks[i];
                return `${r.label}: ${landed}${pick != null ? `, chosen: ${r.sides[pick]}` : ""}`;
              })
              .join(", ")
          : ""}
      </p>

      {done ? (
        <dl key={pulls} className="px-ticket px-pop-in relative text-left">
          <Burst count={10} spread={70} />
          {reels.map((r, i) => {
            const landed = r.sides[shown[i] ?? 0] ?? "";
            const wild = isWild(landed);
            const pick = wildPicks[i];
            return (
              <div
                key={r.label}
                className={cn(
                  "flex gap-x-2 py-0.5",
                  // While a wild waits for a choice the row stacks, so the buttons get the full width.
                  wild && pick == null ? "flex-col" : "items-baseline",
                )}
              >
                <dt className="px-label w-28 shrink-0 text-[0.7rem] leading-tight">{r.label}</dt>
                {/* data-landed: what the reel itself shows, whatever is chosen for a wild */}
                <dd
                  className="min-w-0 flex-1 text-base font-bold leading-tight"
                  data-landed={landed}
                >
                  {!wild ? (
                    landed
                  ) : pick != null ? (
                    <span className="px-pop-in inline-flex flex-wrap items-center gap-x-1.5">
                      <span className="slot-wild-tag">WILD</span>
                      <span className="slot-wild-choice">{r.sides[pick]}</span>
                      <button
                        type="button"
                        className="slot-wild-change"
                        onClick={() => {
                          playChirp("tap");
                          setWildPicks((prev) => {
                            const rest = { ...prev };
                            delete rest[i];
                            return rest;
                          });
                        }}
                      >
                        change
                      </button>
                    </span>
                  ) : (
                    <>
                      {landed}
                      <span
                        className="slot-wild-picker"
                        role="group"
                        aria-label={`Choose for ${r.label}`}
                      >
                        <span className="slot-wild-ask">
                          {/partner/i.test(landed)
                            ? "Tap what your partner chose:"
                            : "Tap what you chose:"}
                        </span>
                        {r.sides.map((option, k) =>
                          isWild(option) ? null : (
                            <button
                              key={option}
                              type="button"
                              className="px-btn px-btn--small px-btn--ghost"
                              onClick={() => {
                                playChirp("success");
                                setWildPicks((prev) => ({ ...prev, [i]: k }));
                              }}
                            >
                              {option}
                            </button>
                          ),
                        )}
                      </span>
                    </>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      <button type="button" className="px-btn px-btn--block" disabled={spinning} onClick={spin}>
        {spinning ? "Spinning…" : stopped ? `${cta} again` : cta}
      </button>

      {footnote ? <p className="text-sm leading-snug text-muted-foreground">{footnote}</p> : null}

      {withTimer ? <RoundTimer /> : null}
    </div>
  );
}

/** A short row of marquee lamps (they blink in turn — see .slot-bulb in pixel.css). */
function Bulbs() {
  return (
    <span className="slot-bulbs" aria-hidden="true">
      <i className="slot-bulb" />
      <i className="slot-bulb" />
      <i className="slot-bulb" />
      <i className="slot-bulb" />
    </span>
  );
}

const PRESETS = [30, 60, 90, 120, 180] as const;
/** The countdown is drawn as this many blocks that go out one by one. */
const TIMER_BLOCKS = 12;

function RoundTimer() {
  const [total, setTotal] = useState(60);
  const [left, setLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      setRunning(false);
      if (!doneRef.current) {
        doneRef.current = true;
        playChirp("success");
        navigator.vibrate?.([40, 60, 40]);
      }
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [running, left]);

  const lit = total > 0 ? Math.ceil((left / total) * TIMER_BLOCKS) : 0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="px-frame p-3">
      <p className="px-label">Round timer</p>

      <p
        className={cn(
          "mt-1 text-5xl font-bold leading-none tabular-nums",
          left === 0 && "arcade-score",
          running && left <= 5 && left > 0 && "px-blink",
        )}
        role="timer"
        aria-live="off"
      >
        {mm}:{ss}
      </p>

      <div
        className="slot-timer-bar mt-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={left}
        aria-label="Time left"
      >
        {Array.from({ length: TIMER_BLOCKS }, (_, i) => (
          <i key={i} className={cn("px-pip", i < lit && "px-pip--on")} />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap justify-center">
        {PRESETS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={total === s}
            onClick={() => {
              playChirp("tap");
              doneRef.current = false;
              setTotal(s);
              setLeft(s);
              setRunning(false);
            }}
            className={cn("px-btn px-btn--small", total !== s && "px-btn--ghost")}
          >
            {s < 60 ? `${s}s` : `${s / 60}m`}
          </button>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-2">
        <button
          type="button"
          className="px-btn"
          onClick={() => {
            playChirp("tap");
            if (left === 0) {
              doneRef.current = false;
              setLeft(total);
            }
            setRunning((r) => !r);
          }}
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {running ? "Pause" : left === 0 ? "Again" : "Start"}
        </button>
        <button
          type="button"
          className="px-btn px-btn--ghost"
          onClick={() => {
            playChirp("tap");
            doneRef.current = false;
            setRunning(false);
            setLeft(total);
          }}
        >
          <RotateCcw className="size-4" /> Reset
        </button>
      </div>

      <p className="mt-2 text-sm leading-snug text-muted-foreground">
        Whoever spun does the combo for the full round, then swap.
      </p>
    </div>
  );
}
