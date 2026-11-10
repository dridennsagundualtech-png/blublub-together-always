import { Doodle, type Critter } from "@/components/Doodles";
import { playChirp } from "@/hooks/use-sound";
import { finishPatch, useUpdateGame } from "@/lib/games";
import type { GameViewProps } from "@/components/games/GameShell";
import { TaskBar } from "@/components/games/TaskBar";
import {
  Burst,
  Caption,
  PixelBoard,
  PixelStage,
  Versus,
  Waiting,
} from "@/components/games/pixel-kit";
import { cn } from "@/lib/utils";

type Throw = "cat" | "seal" | "penguin";

const THROWS: { key: Throw; critter: Critter; name: string; plays: string }[] = [
  { key: "cat", critter: "cat", name: "Cat", plays: "Rock" },
  { key: "seal", critter: "seal", name: "Seal", plays: "Paper" },
  { key: "penguin", critter: "penguin", name: "Penguin", plays: "Scissors" },
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

export function Rps({ game, me, seat, players, nameOf }: GameViewProps) {
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

  const choosingLength = s.round === 1 && !s.picks.some(Boolean);
  // Who took the last round (0 or 1), or null for a drawn round — only used to pose the critters.
  const lastCmp = s.last ? compare(s.last.picks[0]!, s.last.picks[1]!) : 0;
  const lastWinner = lastCmp === 0 ? null : lastCmp === 1 ? 0 : 1;

  return (
    <PixelStage>
      <TaskBar
        game={game}
        status={myPick ? "Waiting for your partner…" : "Pick your throw"}
        onResignTo={players[other]}
      />
      <Versus
        players={players}
        me={me}
        nameOf={nameOf}
        scores={[s.scores[0] ?? 0, s.scores[1] ?? 0]}
        pips={needed}
      />

      <PixelBoard>
        <p className="px-label text-center">
          Round {s.round} · first to {needed}
        </p>
        {choosingLength ? (
          <div className="mt-1 flex justify-center">
            {[3, 5].map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={s.best === b}
                className={cn("px-btn px-btn--small", s.best !== b && "px-btn--ghost")}
                onClick={() => {
                  playChirp("pop");
                  setBest(b);
                }}
              >
                Best of {b}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-2 grid grid-cols-3 gap-1">
          {THROWS.map((t, i) => (
            <button
              key={t.key}
              type="button"
              disabled={!!myPick}
              aria-pressed={myPick === t.key}
              onClick={() => pick(t.key)}
              className={cn(
                "px-throw",
                myPick === t.key && "px-throw--picked",
                myPick && myPick !== t.key && "px-throw--out",
              )}
            >
              <span
                className={!myPick ? "px-bob" : myPick === t.key ? "px-shake" : undefined}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <Doodle critter={t.critter} pose="default" size={56} />
              </span>
              <span className="text-sm font-bold leading-tight">{t.plays}</span>
              <span className="text-xs leading-tight text-muted-foreground">{t.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-3">
          {myPick ? (
            <Caption>
              Locked in — waiting for {nameOf(players[other])} <Waiting />
            </Caption>
          ) : (
            <Caption>Cat beats penguin · penguin beats seal · seal beats cat</Caption>
          )}
        </div>
      </PixelBoard>

      {s.last ? (
        <div className="px-frame p-3 text-center">
          <p className="px-label">Last round</p>
          <div key={s.round} className="relative mt-1 flex items-end justify-center gap-5">
            <span className="px-clash-left">
              <Doodle
                critter={s.last.picks[0] as Critter}
                pose={lastWinner === 0 ? "cheer" : "default"}
                size={56}
              />
            </span>
            <span className="px-vs pb-4">VS</span>
            <span className="px-clash-right">
              <Doodle
                critter={s.last.picks[1] as Critter}
                pose={lastWinner === 1 ? "cheer" : "default"}
                size={56}
              />
            </span>
            <Burst />
          </div>
          <p
            key={`r-${s.round}`}
            className="px-pop-in mt-1 text-base font-bold"
            style={{ animationDelay: "0.35s" }}
          >
            {/* Worded for whoever is looking: the saved text was written on one phone only. */}
            {lastWinner == null
              ? "Draw round"
              : players[lastWinner] === me
                ? "You won the round"
                : `${nameOf(players[lastWinner])} won the round`}
          </p>
        </div>
      ) : null}
    </PixelStage>
  );
}
