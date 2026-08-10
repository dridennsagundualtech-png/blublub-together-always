import { useEffect, useRef, useState } from "react";
import { Dices, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Card, GhostButton, PrimaryButton } from "@/components/ui-kit";
import { playChirp } from "@/hooks/use-sound";

export type DieDef = { label: string; sides: string[]; tone: string };

/** Animated multi-die roller with an optional shared countdown timer. */
export function DiceRoller({
  dice,
  withTimer = false,
  cta = "Roll the dice",
  footnote,
}: {
  dice: DieDef[];
  withTimer?: boolean;
  cta?: string;
  footnote?: string;
}) {
  const [faces, setFaces] = useState<number[]>(() => dice.map(() => 0));
  const [rolled, setRolled] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [nonce, setNonce] = useState(0);

  function roll() {
    if (rolling) return;
    playChirp("pop");
    setRolling(true);
    const spin = setInterval(() => {
      setFaces(dice.map((d) => Math.floor(Math.random() * d.sides.length)));
    }, 80);
    setTimeout(() => {
      clearInterval(spin);
      setFaces(dice.map((d) => Math.floor(Math.random() * d.sides.length)));
      setRolling(false);
      setRolled(true);
      setNonce((n) => n + 1);
      playChirp("success");
    }, 1100);
  }

  return (
    <Card className="text-center">
      <div className={`grid gap-3 ${dice.length > 2 ? "grid-cols-3" : dice.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {dice.map((d, i) => (
          <div key={d.label} className="min-w-0">
            <p className="mb-1 truncate text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
              {d.label}
            </p>
            <div
              key={`${d.label}-${nonce}`}
              className={`grid aspect-square place-items-center rounded-3xl px-2 shadow-soft ${d.tone} ${
                rolling ? "dice-rolling" : rolled ? "dice-settled" : ""
              }`}
              style={{ animationDelay: rolling ? `${i * 60}ms` : `${i * 90}ms` }}
            >
              <span className="text-sm font-extrabold leading-tight">
                {rolled || rolling ? d.sides[faces[i] ?? 0] : "?"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <PrimaryButton disabled={rolling} onClick={roll}>
          <span className="inline-flex items-center gap-2">
            <Dices className={`size-4 ${rolling ? "animate-spin" : ""}`} /> {rolling ? "Rolling…" : cta}
          </span>
        </PrimaryButton>
      </div>

      {withTimer ? <RoundTimer /> : null}
      {footnote ? <p className="mt-3 text-xs text-muted-foreground">{footnote}</p> : null}
    </Card>
  );
}

const PRESETS = [30, 60, 120, 180];

function RoundTimer() {
  const [total, setTotal] = useState(60);
  const [left, setLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(id);
          setRunning(false);
          if (!doneRef.current) {
            doneRef.current = true;
            playChirp("success");
          }
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const pct = total > 0 ? ((total - left) / total) * 100 : 0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="mt-5 rounded-3xl border border-border bg-card/70 p-4">
      <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
        <Timer className="size-3.5" /> Round timer
      </p>

      <p className={`mt-1 text-4xl font-extrabold tabular-nums ${left === 0 ? "text-primary" : ""}`}>
        {mm}:{ss}
      </p>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {PRESETS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              playChirp("tap");
              doneRef.current = false;
              setTotal(s);
              setLeft(s);
              setRunning(false);
            }}
            className={`press rounded-full px-3 py-1.5 text-xs font-bold ${
              total === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {s < 60 ? `${s}s` : `${s / 60}m`}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <PrimaryButton
          onClick={() => {
            playChirp("tap");
            if (left === 0) {
              doneRef.current = false;
              setLeft(total);
            }
            setRunning((r) => !r);
          }}
        >
          <span className="inline-flex items-center gap-2">
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {running ? "Pause" : left === 0 ? "Again" : "Start"}
          </span>
        </PrimaryButton>
        <GhostButton
          onClick={() => {
            playChirp("tap");
            doneRef.current = false;
            setRunning(false);
            setLeft(total);
          }}
        >
          <span className="inline-flex items-center gap-2">
            <RotateCcw className="size-4" /> Reset
          </span>
        </GhostButton>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Roller performs the combo for the full round, then swap.
      </p>
    </div>
  );
}
