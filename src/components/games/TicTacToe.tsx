import { useRef } from "react";
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

/** The three squares of a finished line, or an empty list. */
export function winLineOf(board: (number | null)[]): number[] {
  return (
    LINES.find(
      ([a, b, c]) => board[a!] != null && board[a!] === board[b!] && board[a!] === board[c!],
    ) ?? []
  );
}

export function newTicTacToe() {
  return { board: Array(9).fill(null) as (number | null)[] };
}

export function TicTacToe({ game, me, seat, players, nameOf }: GameViewProps) {
  const update = useUpdateGame();
  const state = game.state as { board: (number | null)[] };
  const board = state.board ?? Array(9).fill(null);
  const myTurn = game.turn === me;
  const winLine = new Set(winLineOf(board));

  const placedAtOpen = useRef(board.map((c) => c != null));

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
    else patch["turn"] = players[seat === 0 ? 1 : 0];
    update.mutate({ id: game.id, patch: patch as never });
  }

  return (
    <PixelStage>
      <TaskBar
        game={game}
        status={myTurn ? "Your turn" : `${nameOf(game.turn)}'s turn`}
        onResignTo={players[seat === 0 ? 1 : 0]}
      />
      <Versus players={players} me={me} nameOf={nameOf} turn={game.turn} />
      <PixelBoard>
        <div className="mx-auto grid max-w-xs grid-cols-3 gap-1.5">
          {board.map((cell, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Square ${i + 1}, ${cell == null ? "empty" : SEAT_CRITTER[cell as 0 | 1]}`}
              onClick={() => play(i)}
              className={cn(
                "px-cell",
                winLine.has(i) && "px-cell--win",
                cell == null && myTurn && "px-cell--open",
              )}
            >
              {cell == null ? null : (
                // Keyed by what's in the square, so a new piece mounts and pops in.
                <span
                  key={`${i}-${cell}`}
                  className={placedAtOpen.current[i] ? undefined : "px-piece-pop"}
                >
                  <Doodle
                    critter={SEAT_CRITTER[cell as 0 | 1]}
                    pose={winLine.has(i) ? "cheer" : "default"}
                    size={60}
                  />
                </span>
              )}
            </button>
          ))}
        </div>
      </PixelBoard>
      <Caption>You are the {SEAT_CRITTER[seat]}</Caption>
    </PixelStage>
  );
}
