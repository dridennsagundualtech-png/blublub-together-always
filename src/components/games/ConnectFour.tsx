import { Doodle } from "@/components/Doodles";
import { Card } from "@/components/ui-kit";
import { playChirp } from "@/hooks/use-sound";
import { finishPatch, useUpdateGame } from "@/lib/games";
import type { GameViewProps } from "@/components/games/GameShell";
import { TaskBar } from "@/components/games/TaskBar";

const COLS = 7;
const ROWS = 6;

type C4State = { board: (number | null)[] };

export function newConnect4(): C4State {
  return { board: Array(COLS * ROWS).fill(null) };
}

const at = (board: (number | null)[], r: number, c: number) =>
  r < 0 || r >= ROWS || c < 0 || c >= COLS ? undefined : board[r * COLS + c];

function hasFour(board: (number | null)[], seat: number): boolean {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (at(board, r, c) !== seat) continue;
      for (const [dr, dc] of dirs) {
        let n = 1;
        while (n < 4 && at(board, r + dr! * n, c + dc! * n) === seat) n += 1;
        if (n === 4) return true;
      }
    }
  }
  return false;
}

export function ConnectFour({ game, me, seat, players, nameOf }: GameViewProps) {
  const update = useUpdateGame();
  const s = game.state as C4State;
  const board = s.board ?? Array(COLS * ROWS).fill(null);
  const myTurn = game.turn === me;
  const other = seat === 0 ? 1 : 0;

  function drop(col: number) {
    if (!myTurn || update.isPending) return;
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r -= 1) {
      if (board[r * COLS + col] == null) {
        row = r;
        break;
      }
    }
    if (row < 0) return;
    playChirp("pop");
    const next = [...board];
    next[row * COLS + col] = seat;
    const patch: Record<string, unknown> = { state: { board: next } };
    if (hasFour(next, seat)) Object.assign(patch, finishPatch(players[seat] ?? null));
    else if (next.every((c) => c != null)) Object.assign(patch, finishPatch(null));
    else patch['turn'] = players[other];
    update.mutate({ id: game.id, patch: patch as never });
  }

  return (
    <>
      <TaskBar
        game={game}
        status={myTurn ? "Your turn — drop a piece" : `${nameOf(game.turn)}'s turn`}
        onResignTo={players[other]}
      />

      <Card className="mt-4">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: COLS }).map((_, c) => (
            <button
              key={`h-${c}`}
              type="button"
              aria-label={`Drop in column ${c + 1}`}
              onClick={() => drop(c)}
              className="press rounded-xl bg-muted py-1 text-xs font-extrabold text-muted-foreground"
            >
              ↓
            </button>
          ))}
          {board.map((cell, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => drop(i % COLS)}
              className="grid aspect-square place-items-center rounded-full bg-secondary"
            >
              {cell == null ? null : (
                <Doodle
                  critter={cell === 0 ? "penguin" : "seal"}
                  pose={cell === 0 ? "default" : "wave"}
                  size={30}
                />
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
