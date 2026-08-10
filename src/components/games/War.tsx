import { Doodle, type Critter, type Pose } from "@/components/Doodles";
import { Card, PrimaryButton } from "@/components/ui-kit";
import { playChirp } from "@/hooks/use-sound";
import { finishPatch, shuffle, useUpdateGame } from "@/lib/games";
import type { GameViewProps } from "@/components/games/GameShell";
import { TaskBar } from "@/components/games/TaskBar";

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

export function War({ game, seat, players, nameOf }: GameViewProps) {
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

  return (
    <>
      <TaskBar
        game={game}
        status={`Round ${Math.min(s.round, ROUNDS)} of ${ROUNDS}`}
        onResignTo={players[other]}
      />

      <Card className="mt-4 text-center">
        <div className="flex items-center justify-center gap-6">
          {[0, 1].map((p) => (
            <div key={p} className="grid place-items-center gap-2">
              <div className="grid h-28 w-20 place-items-center rounded-2xl bg-secondary shadow-soft">
                {s.flip ? (
                  <span className="text-3xl font-extrabold text-primary">
                    {rankLabel(s.flip[p] ?? 0)}
                  </span>
                ) : (
                  <Doodle critter={back.critter} pose={back.pose} size={48} />
                )}
              </div>
              <p className="text-xs font-bold">{nameOf(players[p])}</p>
              <p className="text-xs text-muted-foreground">{s.scores[p] ?? 0} won</p>
            </div>
          ))}
        </div>

        {s.note ? <p className="mt-4 text-sm font-bold">{s.note}</p> : null}

        <div className="mt-4">
          {s.flip ? (
            <PrimaryButton onClick={next}>
              {s.round >= ROUNDS ? "Finish game" : "Next round"}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={flip}>Flip cards</PrimaryButton>
          )}
        </div>
      </Card>
    </>
  );
}
