/**
 * A small picture of how a finished game ended, shown on the result card: the final board
 * for the board games, the final score for the others. Read-only; it only looks at the saved
 * state and never changes anything.
 */
import { Doodle } from "@/components/Doodles";
import { COLS, fourCells } from "@/components/games/ConnectFour";
import { winLineOf } from "@/components/games/TicTacToe";
import { SEAT_CRITTER } from "@/components/games/pixel-kit";
import { useSeats, type GameRow } from "@/lib/games";
import { cn } from "@/lib/utils";

type Cells = (number | null)[];

const isCells = (v: unknown, length: number): v is Cells => Array.isArray(v) && v.length === length;

export function GameRecap({ game }: { game: GameRow }) {
  const { players, nameOf, me } = useSeats(game);
  const state = (game.state ?? {}) as { board?: unknown; scores?: unknown };

  if (game.kind === "tictactoe" && isCells(state.board, 9)) {
    const board = state.board;
    const line = new Set(winLineOf(board));
    return (
      <div className="mx-auto mt-3 grid w-36 grid-cols-3 gap-1" aria-label="Final board">
        {board.map((cell, i) => (
          <span key={i} className={cn("px-cell", line.has(i) && "px-cell--win")}>
            {cell == null ? null : (
              <Doodle
                critter={SEAT_CRITTER[cell as 0 | 1]}
                pose={line.has(i) ? "cheer" : "default"}
                size={34}
              />
            )}
          </span>
        ))}
      </div>
    );
  }

  if (game.kind === "connect4" && isCells(state.board, 42)) {
    const board = state.board;
    const four = new Set(fourCells(board, 0) ?? fourCells(board, 1) ?? []);
    return (
      <div
        className="px-tint-sky mx-auto mt-3 grid w-44 gap-0.5 p-1.5"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        aria-label="Final board"
      >
        {board.map((cell, i) => (
          <span key={i} className="px-slot">
            <i className="px-hole px-round" />
            {cell == null ? null : (
              <span
                className={cn("px-coin px-round", `px-coin--${cell}`, four.has(i) && "px-flash")}
              />
            )}
          </span>
        ))}
      </div>
    );
  }

  const scores = state.scores;
  if (Array.isArray(scores) && scores.length === 2 && scores.every((n) => typeof n === "number")) {
    const label = (seat: 0 | 1) => (players[seat] === me ? "You" : nameOf(players[seat]));
    return (
      <p className="mt-2 text-lg font-bold tabular-nums">
        {label(0)} {scores[0]} — {scores[1]} {label(1)}
      </p>
    );
  }

  return null;
}
