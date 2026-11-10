import { Doodle, type Critter, type Pose } from "@/components/Doodles";
import { PixelEmoji } from "@/components/pixel-art";
import { playChirp } from "@/hooks/use-sound";
import { finishPatch, shuffle, useUpdateGame } from "@/lib/games";
import type { GameViewProps } from "@/components/games/GameShell";
import { TaskBar } from "@/components/games/TaskBar";
import { Burst, Pips, PixelBoard, PixelStage, Versus } from "@/components/games/pixel-kit";
import { cn } from "@/lib/utils";

const ROUNDS = 13;
const BACKS: { critter: Critter; pose: Pose }[] = [
  { critter: "cat", pose: "wave" },
  { critter: "seal", pose: "peek" },
  { critter: "penguin", pose: "curious" },
];

const LABEL: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
const rankLabel = (n: number) => LABEL[n] ?? String(n);

type WarState = {
  decks: number[][];
  flip: number[] | null;
  scores: number[];
  round: number;
  note: string | null;
};

export function newWar(): WarState {
  const ranks: number[] = [];
  for (let r = 2; r <= 14; r += 1) for (let i = 0; i < 4; i += 1) ranks.push(r);
  const deck = shuffle(ranks);
  return {
    decks: [deck.slice(0, 26), deck.slice(26, 52)],
    flip: null,
    scores: [0, 0],
    round: 1,
    note: null,
  };
}

export function War({ game, me, seat, players, nameOf }: GameViewProps) {
  const update = useUpdateGame();
  const s = game.state as WarState;
  const other = seat === 0 ? 1 : 0;
  const back = BACKS[s.round % BACKS.length]!;

  function flip() {
    if (s.flip || update.isPending) return;
    playChirp("pop");
    const decks = [[...(s.decks[0] ?? [])], [...(s.decks[1] ?? [])]];
    const a = decks[0]!.shift()!;
    const b = decks[1]!.shift()!;
    const scores = [...s.scores];
    let note = "Tie — nobody scores";
    if (a > b) {
      scores[0] = (scores[0] ?? 0) + 1;
      note = `${nameOf(players[0])} takes the round`;
    } else if (b > a) {
      scores[1] = (scores[1] ?? 0) + 1;
      note = `${nameOf(players[1])} takes the round`;
    }
    update.mutate({
      id: game.id,
      patch: { state: { ...s, decks, flip: [a, b], scores, note } } as never,
    });
  }

  function next() {
    const round = s.round + 1;
    const state = { ...s, flip: null, note: null, round };
    const patch: Record<string, unknown> = { state };
    if (round > ROUNDS) {
      const [x, y] = [s.scores[0] ?? 0, s.scores[1] ?? 0];
      const winnerSeat = x === y ? null : x > y ? 0 : 1;
      Object.assign(patch, finishPatch(winnerSeat == null ? null : (players[winnerSeat] ?? null)));
    }
    update.mutate({ id: game.id, patch: patch as never });
  }

  const round = Math.min(s.round, ROUNDS);
  // Worded for whoever is looking (the note saved with the game was written on one phone only).
  const [a, b] = s.flip ?? [0, 0];
  const roundText = !s.flip
    ? null
    : a === b
      ? "Tie — nobody scores"
      : players[a! > b! ? 0 : 1] === me
        ? "You take the round"
        : `${nameOf(players[a! > b! ? 0 : 1])} takes the round`;

  return (
    <PixelStage>
      <TaskBar game={game} status={`Round ${round} of ${ROUNDS}`} onResignTo={players[other]} />
      <Versus
        players={players}
        me={me}
        nameOf={nameOf}
        scores={[s.scores[0] ?? 0, s.scores[1] ?? 0]}
      />

      <PixelBoard className="text-center">
        <div className="flex justify-center" title={`Round ${round} of ${ROUNDS}`}>
          <Pips total={ROUNDS} filled={s.flip ? round : round - 1} />
        </div>

        <div className="mt-4 flex items-end justify-center gap-7">
          {[0, 1].map((p) => {
            const mine = s.flip?.[p] ?? 0;
            const theirs = s.flip?.[p === 0 ? 1 : 0] ?? 0;
            const wins = !!s.flip && mine > theirs;
            const rank = s.flip ? rankLabel(mine) : "";
            return (
              <div key={p} className="grid place-items-center gap-2">
                <div className={cn("flip-scene relative h-32 w-24", wins && "px-lift")}>
                  <div className={cn("flip-card", s.flip && "is-flipped")}>
                    <div className="flip-face px-card-back">
                      <Doodle critter={back.critter} pose={back.pose} size={52} />
                    </div>
                    <div
                      className={cn("flip-face flip-face-front px-card", wins && "px-card--win")}
                    >
                      <span className="absolute left-1.5 top-1 text-base font-bold leading-none">
                        {rank}
                      </span>
                      <PixelEmoji name="heart" size={16} className="absolute left-1 top-6" />
                      <span className="text-5xl font-bold leading-none">{rank}</span>
                      <PixelEmoji name="heart" size={16} className="absolute bottom-1.5 right-1" />
                    </div>
                  </div>
                  {wins ? <Burst key={s.round} spread={54} /> : null}
                </div>
                <p className="text-sm font-bold leading-none">
                  {players[p] === me ? "You" : nameOf(players[p])}
                </p>
              </div>
            );
          })}
        </div>

        <p
          key={s.round}
          className={cn("mt-3 min-h-5 text-base font-bold", roundText && "px-pop-in")}
          style={{ animationDelay: "0.4s" }}
        >
          {roundText ?? "High card takes the round"}
        </p>

        <button
          type="button"
          className="px-btn px-btn--block mt-2"
          disabled={update.isPending}
          onClick={() => {
            playChirp("tap");
            if (s.flip) next();
            else flip();
          }}
        >
          {s.flip ? (s.round >= ROUNDS ? "Finish game" : "Next round") : "Flip cards"}
        </button>
      </PixelBoard>
    </PixelStage>
  );
}
