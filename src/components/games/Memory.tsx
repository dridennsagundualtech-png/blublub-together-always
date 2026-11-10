import { useEffect, useRef } from "react";
import { Doodle, type Critter, type Pose } from "@/components/Doodles";
import { PixelEmoji } from "@/components/pixel-art";
import { playChirp } from "@/hooks/use-sound";
import { finishPatch, shuffle, useUpdateGame } from "@/lib/games";
import type { GameViewProps } from "@/components/games/GameShell";
import { TaskBar } from "@/components/games/TaskBar";
import { Burst, Caption, PixelBoard, PixelStage, Versus } from "@/components/games/pixel-kit";
import { cn } from "@/lib/utils";

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
  // Pairs already found when the game was opened don't replay their sparkle.
  const matchedAtOpen = useRef(new Set(s.matched));

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

  const pairsLeft = (s.deck.length - s.matched.length) / 2;

  return (
    <PixelStage>
      <TaskBar
        game={game}
        status={myTurn ? "Your turn — flip two" : `${nameOf(game.turn)}'s turn`}
        onResignTo={players[other]}
      />
      <Versus
        players={players}
        me={me}
        nameOf={nameOf}
        turn={game.turn}
        scores={[s.scores[0] ?? 0, s.scores[1] ?? 0]}
      />

      <PixelBoard>
        <div className="grid grid-cols-4 gap-2.5">
          {s.deck.map((face, i) => {
            const matched = s.matched.includes(i);
            const shown = s.flipped.includes(i) || matched;
            const f = FACES[face]!;
            return (
              <button
                key={i}
                type="button"
                aria-label={shown ? `${f.critter} card` : "Face-down card"}
                onClick={() => flip(i)}
                className="flip-scene relative aspect-square border-0 bg-transparent p-0"
              >
                {/* "block": a span is inline by default and would ignore the card's size */}
                <span className={cn("flip-card block", shown && "is-flipped")}>
                  <span className="flip-face px-card-back">
                    <PixelEmoji name="heart" size={22} />
                  </span>
                  <span
                    className={cn(
                      "flip-face flip-face-front px-card",
                      matched && "px-card--matched",
                    )}
                  >
                    <Doodle critter={f.critter} pose={f.pose} size={44} />
                  </span>
                </span>
                {matched && !matchedAtOpen.current.has(i) ? <Burst /> : null}
              </button>
            );
          })}
        </div>
      </PixelBoard>
      <Caption>
        {pairsLeft} pair{pairsLeft === 1 ? "" : "s"} left · a match earns another turn
      </Caption>
    </PixelStage>
  );
}
