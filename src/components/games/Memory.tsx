import { useEffect, useRef } from "react";
import { Doodle, type Critter, type Pose } from "@/components/Doodles";
import { Card } from "@/components/ui-kit";
import { playChirp } from "@/hooks/use-sound";
import { finishPatch, shuffle, useUpdateGame } from "@/lib/games";
import type { GameViewProps } from "@/components/games/GameShell";
import { TaskBar } from "@/components/games/TaskBar";

const FACES: { critter: Critter; pose: Pose }[] = [
  { critter: "cat", pose: "default" },
  { critter: "cat", pose: "love" },
  { critter: "seal", pose: "cheer" },
  { critter: "seal", pose: "wave" },
  { critter: "penguin", pose: "curious" },
  { critter: "penguin", pose: "sleep" },
];


type MemoryState = {
  deck: number[];
  flipped: number[];
  matched: number[];
  scores: number[];
};

export function newMemory(): MemoryState {
  const deck = shuffle([...FACES.keys(), ...FACES.keys()]);
  return { deck, flipped: [], matched: [], scores: [0, 0] };
}

export function Memory({ game, me, seat, players, nameOf }: GameViewProps) {
  const update = useUpdateGame();
  const s = game.state as MemoryState;
  const myTurn = game.turn === me;
  const other = seat === 0 ? 1 : 0;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The active player's client clears a failed pair and hands over the turn.
  useEffect(() => {
    if (!myTurn || s.flipped.length !== 2) return;
    const [a, b] = s.flipped as [number, number];
    if (s.deck[a] === s.deck[b]) return;
    timer.current = setTimeout(() => {
      update.mutate({
        id: game.id,
        patch: { state: { ...s, flipped: [] }, turn: players[other] } as never,
      });
    }, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, myTurn, s.flipped.length]);

  function flip(i: number) {
    if (!myTurn || s.flipped.includes(i) || s.matched.includes(i) || s.flipped.length >= 2) return;
    playChirp("pop");
    const flipped = [...s.flipped, i];
    if (flipped.length < 2) {
      update.mutate({ id: game.id, patch: { state: { ...s, flipped } } as never });
      return;
    }
    const [a, b] = flipped as [number, number];
    if (s.deck[a] !== s.deck[b]) {
      update.mutate({ id: game.id, patch: { state: { ...s, flipped } } as never });
      return;
    }
    const matched = [...s.matched, a, b];
    const scores = [...s.scores];
    scores[seat] = (scores[seat] ?? 0) + 1;
    const next = { ...s, flipped: [], matched, scores };
    const patch: Record<string, unknown> = { state: next };
    if (matched.length === s.deck.length) {
      const winnerSeat =
        (scores[0] ?? 0) === (scores[1] ?? 0) ? null : (scores[0] ?? 0) > (scores[1] ?? 0) ? 0 : 1;
      Object.assign(patch, finishPatch(winnerSeat == null ? null : (players[winnerSeat] ?? null)));
    }
    update.mutate({ id: game.id, patch: patch as never });
  }

  return (
    <>
      <TaskBar
        game={game}
        status={myTurn ? "Your turn — flip two" : `${nameOf(game.turn)}'s turn`}
        onResignTo={players[other]}
      />

      <Card className="mt-4">
        <div className="grid grid-cols-4 gap-2">
          {s.deck.map((face, i) => {
            const shown = s.flipped.includes(i) || s.matched.includes(i);
            const f = FACES[face]!;
            const matched = s.matched.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-label={shown ? `${f.critter} card` : "Face-down card"}
                onClick={() => flip(i)}
                className={`press flip-scene aspect-square rounded-2xl ${matched ? "match-pop" : ""}`}
              >
                <span className={`flip-card rounded-2xl ${shown ? "is-flipped" : ""}`}>
                  <span className="flip-face rounded-2xl bg-muted">
                    <span className="text-lg font-extrabold text-muted-foreground">🩷</span>
                  </span>
                  <span
                    className={`flip-face flip-face-front rounded-2xl bg-accent ${matched ? "opacity-60" : ""}`}
                  >
                    <Doodle critter={f.critter} pose={f.pose} size={40} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {nameOf(players[0])} {s.scores[0] ?? 0} — {s.scores[1] ?? 0} {nameOf(players[1])}
        </p>
      </Card>
    </>
  );
}
