import { useRef, type CSSProperties } from "react";
import { Doodle } from "@/components/Doodles";
import { playChirp } from "@/hooks/use-sound";
import { finishPatch, useUpdateGame } from "@/lib/games";
import type { GameViewProps } from "@/components/games/GameShell";
import { TaskBar } from "@/components/games/TaskBar";
import {
  Caption,
  PixelBoard,
  PixelStage,
  SEAT_CRITTER,
  Versus,
} from "@/components/games/pixel-kit";
import { cn } from "@/lib/utils";

export const COLS = 7;
export const ROWS = 6;

type C4State = { board: (number | null)[] };

export function newConnect4(): C4State {
  return { board: Array(COLS * ROWS).fill(null) };
}

const at = (board: (number | null)[], r: number, c: number) =>
  r < 0 || r >= ROWS || c < 0 || c >= COLS ? undefined : board[r * COLS + c];

/** The four winning cells for `seat`, or null. */
export function fourCells(board: (number | null)[], seat: number): number[] | null {
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
        if (n === 4) return [0, 1, 2, 3].map((k) => (r + dr! * k) * COLS + (c + dc! * k));
      }
    }
  }
  return null;
}

export function ConnectFour({ game, me, seat, players, nameOf }: GameViewProps) {
  const update = useUpdateGame();
  const s = game.state as C4State;
  const board = s.board ?? Array(COLS * ROWS).fill(null);
  const myTurn = game.turn === me;
  const other = seat === 0 ? 1 : 0;
  const winning = new Set(fourCells(board, 0) ?? fourCells(board, 1) ?? []);
  // Pieces already on the board when you open the game don't replay their drop.
  const placedAtOpen = useRef(board.map((c) => c != null));

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
    if (fourCells(next, seat)) Object.assign(patch, finishPatch(players[seat] ?? null));
    else if (next.every((c) => c != null)) Object.assign(patch, finishPatch(null));
    else patch["turn"] = players[other];
    update.mutate({ id: game.id, patch: patch as never });
  }

  return (
    <PixelStage>
      <TaskBar
        game={game}
        status={myTurn ? "Your turn — drop a piece" : `${nameOf(game.turn)}'s turn`}
        onResignTo={players[other]}
      />
      <Versus players={players} me={me} nameOf={nameOf} turn={game.turn} />

      <PixelBoard tint="sky" className="overflow-hidden">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: COLS }).map((_, c) => {
            const open = myTurn && board[c] == null; // top hole of the column still free
            return (
              <button
                key={`h-${c}`}
                type="button"
                aria-label={`Drop in column ${c + 1}`}
                onClick={() => drop(c)}
                className={cn("px-drop", open && "px-drop--live")}
                style={{ animationDelay: `${(c % 2) * 0.35}s` }}
              />
            );
          })}
          {board.map((cell, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => drop(i % COLS)}
              className="px-slot"
            >
              <i className="px-hole px-round" />
              {cell == null ? null : (
                // Keyed by what's in the cell, so a new piece mounts and falls down its column.
                <span
                  key={`${i}-${cell}`}
                  className={cn(
                    "px-coin px-round",
                    `px-coin--${cell}`,
                    !placedAtOpen.current[i] && "px-piece-drop",
                    winning.has(i) && "px-flash",
                  )}
                  style={{ "--drop": Math.floor(i / COLS) + 1 } as CSSProperties}
                >
                  <Doodle
                    critter={SEAT_CRITTER[cell as 0 | 1]}
                    pose={winning.has(i) ? "cheer" : "default"}
                    size={28}
                  />
                </span>
              )}
            </button>
          ))}
        </div>
      </PixelBoard>
      <Caption>
        You are the {SEAT_CRITTER[seat]} · {seat === 0 ? "blue" : "pink"} pieces
      </Caption>
    </PixelStage>
  );
}
