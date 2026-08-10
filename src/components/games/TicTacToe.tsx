import { Doodle } from "@/components/Doodles";
import { Card } from "@/components/ui-kit";
import { playChirp } from "@/hooks/use-sound";
import { finishPatch, useUpdateGame } from "@/lib/games";
import type { GameViewProps } from "@/components/games/GameShell";
import { TaskBar } from "@/components/games/TaskBar";

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winnerOf(board: (number | null)[]): number | null {
  for (const [a, b, c] of LINES) {
    const v = board[a!];
    if (v != null && v === board[b!] && v === board[c!]) return v;
  }
  return null;
}

export function newTicTacToe() {
  return { board: Array(9).fill(null) as (number | null)[] };
}

export function TicTacToe({ game, me, seat, players, nameOf }: GameViewProps) {
  const update = useUpdateGame();
  const state = game.state as { board: (number | null)[] };
  const board = state.board ?? Array(9).fill(null);
  const myTurn = game.turn === me;

  function play(i: number) {
    if (!myTurn || board[i] != null || update.isPending) return;
    const next = [...board];
    next[i] = seat;
    playChirp("pop");
    const w = winnerOf(next);
    const full = next.every((c) => c != null);
    const patch: Record<string, unknown> = { state: { board: next } };
    if (w != null) Object.assign(patch, finishPatch(players[w] ?? null));
    else if (full) Object.assign(patch, finishPatch(null));
    else patch['turn'] = players[seat === 0 ? 1 : 0];
    update.mutate({ id: game.id, patch: patch as never });
  }

  return (
    <>
      <TaskBar
        game={game}
        status={myTurn ? "Your turn" : `${nameOf(game.turn)}'s turn`}
        onResignTo={players[seat === 0 ? 1 : 0]}
      />
      <Card className="mt-4">
        <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
          {board.map((cell, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Square ${i + 1}`}
              onClick={() => play(i)}
              className="press grid aspect-square place-items-center rounded-2xl bg-muted"
            >
              {cell == null ? null : (
                <Doodle critter={cell === 0 ? "penguin" : "seal"} pose={cell === 0 ? "default" : "wave"} size={44} />
              )}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          You are {seat === 0 ? "penguin 🐧" : "seal 🦭"}
        </p>
      </Card>
    </>
  );
}
