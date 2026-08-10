import { Doodle, type Critter } from "@/components/Doodles";
import { Card, GhostButton } from "@/components/ui-kit";
import { playChirp } from "@/hooks/use-sound";
import { finishPatch, useUpdateGame } from "@/lib/games";
import type { GameViewProps } from "@/components/games/GameShell";
import { TaskBar } from "@/components/games/TaskBar";

type Throw = "cat" | "seal" | "penguin";

const THROWS: { key: Throw; critter: Critter; label: string }[] = [
  { key: "cat", critter: "cat", label: "Cat · rock" },
  { key: "seal", critter: "seal", label: "Seal · paper" },
  { key: "penguin", critter: "penguin", label: "Penguin · scissors" },
];

/** returns 0 for a draw, 1 if a beats b, -1 otherwise */
function compare(a: Throw, b: Throw): number {
  if (a === b) return 0;
  const beats: Record<Throw, Throw> = { cat: "penguin", penguin: "seal", seal: "cat" };
  return beats[a] === b ? 1 : -1;
}

type RpsState = {
  picks: (Throw | null)[];
  scores: number[];
  round: number;
  best: number;
  last: { picks: Throw[]; result: string } | null;
};

export function newRps(): RpsState {
  return { picks: [null, null], scores: [0, 0], round: 1, best: 3, last: null };
}

export function Rps({ game, seat, players, nameOf }: GameViewProps) {
  const update = useUpdateGame();
  const s = game.state as RpsState;
  const other = seat === 0 ? 1 : 0;
  const needed = Math.ceil(s.best / 2);
  const myPick = s.picks[seat] ?? null;
  const theirPick = s.picks[other] ?? null;

  function setBest(best: number) {
    update.mutate({ id: game.id, patch: { state: { ...s, best } } as never });
  }

  function pick(t: Throw) {
    if (myPick) return;
    playChirp("pop");
    const picks = [...s.picks];
    picks[seat] = t;

    if (!theirPick) {
      update.mutate({ id: game.id, patch: { state: { ...s, picks } } as never });
      return;
    }

    // Second pick resolves the round in one atomic write.
    const mine = t;
    const theirs = theirPick;
    const cmp = compare(mine, theirs);
    const scores = [...s.scores];
    if (cmp === 1) scores[seat] = (scores[seat] ?? 0) + 1;
    if (cmp === -1) scores[other] = (scores[other] ?? 0) + 1;
    const ordered: Throw[] = seat === 0 ? [mine, theirs] : [theirs, mine];
    const next: RpsState = {
      ...s,
      picks: [null, null],
      scores,
      round: s.round + 1,
      last: {
        picks: ordered,
        result:
          cmp === 0
            ? "Draw round"
            : `${cmp === 1 ? nameOf(players[seat]) : nameOf(players[other])} won the round`,
      },
    };
    const patch: Record<string, unknown> = { state: next };
    const winnerSeat = (scores[0] ?? 0) >= needed ? 0 : (scores[1] ?? 0) >= needed ? 1 : null;
    if (winnerSeat != null) Object.assign(patch, finishPatch(players[winnerSeat] ?? null));
    update.mutate({ id: game.id, patch: patch as never });
  }

  return (
    <>
      <TaskBar
        game={game}
        status={myPick ? "Waiting for your partner…" : "Pick your throw"}
        onResignTo={players[other]}
      />

      <Card className="mt-4 text-center">
        <p className="text-sm font-bold">
          {s.scores[0] ?? 0} — {s.scores[1] ?? 0}
        </p>
        <p className="text-xs text-muted-foreground">
          {nameOf(players[0])} vs {nameOf(players[1])} · first to {needed}
        </p>
        {s.round === 1 && !s.picks.some(Boolean) ? (
          <div className="mt-3 flex justify-center gap-2">
            {[3, 5].map((b) => (
              <GhostButton
                key={b}
                className={s.best === b ? "border-primary text-primary" : ""}
                onClick={() => setBest(b)}
              >
                Best of {b}
              </GhostButton>
            ))}
          </div>
        ) : null}
      </Card>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {THROWS.map((t) => (
          <button
            key={t.key}
            type="button"
            disabled={!!myPick}
            onClick={() => pick(t.key)}
            className={`press card-soft grid place-items-center gap-1 p-3 ${
              myPick === t.key ? "ring-2 ring-primary" : ""
            } ${myPick && myPick !== t.key ? "opacity-50" : ""}`}
          >
            <Doodle critter={t.critter} pose="default" size={48} />
            <span className="text-[10px] font-bold">{t.label}</span>
          </button>
        ))}
      </div>

      {s.last ? (
        <Card className="mt-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Last round
          </p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <Doodle critter={s.last.picks[0] as Critter} size={40} />
            <span className="text-xs font-bold">vs</span>
            <Doodle critter={s.last.picks[1] as Critter} size={40} />
          </div>
          <p className="mt-1 text-sm font-bold">{s.last.result}</p>
        </Card>
      ) : null}
    </>
  );
}
