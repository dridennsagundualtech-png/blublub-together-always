import { useMemo, useState, type ReactNode, type CSSProperties } from "react";
import { toast } from "sonner";
import { Doodle } from "@/components/Doodles";
import { GameRecap } from "@/components/games/Recap";
import { SEAT_CRITTER } from "@/components/games/pixel-kit";
import { playChirp } from "@/hooks/use-sound";
import {
  GAME_META,
  useActiveGame,
  useCreateGame,
  useGames,
  useSeats,
  type GameKind,
  type GameRow,
} from "@/lib/games";
import { cn } from "@/lib/utils";

export type GameViewProps = {
  game: GameRow;
  me: string;
  seat: 0 | 1;
  players: [string | null, string | null];
  nameOf: (id: string | null | undefined) => string;
};

/**
 * Handles the shared flow for every loser-task game:
 * lock in a task → play → show the result with the task.
 */
export function GameShell({
  kind,
  newState,
  children,
}: {
  kind: GameKind;
  newState: () => unknown;
  children: (props: GameViewProps) => ReactNode;
}) {
  const { data: all } = useGames();
  const { game, isLoading } = useActiveGame(kind);
  const seats = useSeats(game);
  const create = useCreateGame();
  const [task, setTask] = useState("");
  const [dismissed, setDismissed] = useState<string[]>([]);

  const lastDone = useMemo(
    () => (all ?? []).find((g) => g.kind === kind && g.status === "done") ?? null,
    [all, kind],
  );

  if (isLoading) {
    return (
      <div className="pixel-zone">
        <div className="px-frame grid place-items-center gap-1 p-6">
          <span className="px-hop">
            <Doodle critter="cat" pose="default" size={48} />
          </span>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (game && seats.me) {
    return (
      <>
        {children({
          game,
          me: seats.me,
          seat: seats.seat as 0 | 1,
          players: seats.players,
          nameOf: seats.nameOf,
        })}
      </>
    );
  }

  const showResult = lastDone && !dismissed.includes(lastDone.id);
  const canStart = !!task.trim() && !create.isPending;

  return (
    <div className="pixel-zone">
      {showResult ? <ResultCard game={lastDone} nameOf={seats.nameOf} me={seats.me} /> : null}

      <div className={cn("px-frame p-4", showResult && "mt-4")}>
        {/* The two players squaring up */}
        <div className="flex items-end justify-center gap-4" aria-hidden="true">
          <span className="px-hop">
            <Doodle critter={SEAT_CRITTER[0]} pose="wave" size={56} />
          </span>
          <span className="px-vs pb-4 text-lg">VS</span>
          <span className="px-hop" style={{ animationDelay: "0.25s" }}>
            <Doodle critter={SEAT_CRITTER[1]} pose="wave" size={56} />
          </span>
        </div>
        <p className="mt-1 text-center text-xl font-bold leading-tight">{GAME_META[kind].label}</p>
        <p className="text-center text-sm text-muted-foreground">{GAME_META[kind].blurb}</p>

        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canStart) return;
            playChirp("tap");
            if (lastDone) setDismissed((d) => [...d, lastDone.id]);
            create.mutate(
              { kind, task: task.trim(), state: newState() },
              {
                onSuccess: () => {
                  setTask("");
                  playChirp("success");
                },
                onError: (e: Error) => toast.error(e.message),
              },
            );
          }}
        >
          <label className="block">
            <span className="px-label">Task for the loser</span>
            <input
              className="px-input mt-1"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. make coffee tomorrow"
              maxLength={200}
              enterKeyHint="go"
            />
          </label>
          <button type="submit" className="px-btn px-btn--block mt-2" disabled={!canStart}>
            {create.isPending ? "Starting…" : "Lock in task & start"}
          </button>
        </form>
        <p className="mt-2 text-sm leading-snug text-muted-foreground">
          The task is locked before the game starts — the loser has to do it.
        </p>
      </div>
    </div>
  );
}

export function ResultCard({
  game,
  nameOf,
  me,
}: {
  game: GameRow;
  nameOf: (id: string | null | undefined) => string;
  me: string | null;
}) {
  const iLost = !game.is_draw && !!game.winner_id && game.winner_id !== me;
  const iWon = !game.is_draw && !!game.winner_id && game.winner_id === me;
  // The starter of a game is the penguin, the other player the seal.
  const mine = SEAT_CRITTER[game.created_by === me ? 0 : 1];
  const theirs = SEAT_CRITTER[game.created_by === me ? 1 : 0];
  return (
    <div className="px-frame px-pop-in relative overflow-hidden p-5 text-center">
      {iWon ? <Confetti /> : null}
      <div className="flex items-end justify-center gap-3" aria-hidden="true">
        {game.is_draw ? (
          <>
            <Doodle critter={mine} pose="wave" size={64} />
            <Doodle critter={theirs} pose="wave" size={64} />
          </>
        ) : (
          <>
            <span className={iWon ? "px-hop" : undefined}>
              <Doodle critter={mine} pose={iWon ? "cheer" : "sleep"} size={iWon ? 76 : 56} />
            </span>
            <span className={iLost ? "px-hop" : undefined}>
              <Doodle critter={theirs} pose={iLost ? "cheer" : "sleep"} size={iLost ? 76 : 56} />
            </span>
          </>
        )}
      </div>
      <p className="mt-1 text-3xl font-bold leading-tight">
        {game.is_draw ? "It's a draw!" : iLost ? "You lost!" : "You won!"}
      </p>
      <p className="text-sm text-muted-foreground">
        {game.is_draw ? "Nobody owes anything" : `${nameOf(game.winner_id)} took the win`}
      </p>
      <GameRecap game={game} />
      {game.task ? (
        <div className="px-ticket mt-3">
          <p className="px-label">
            {game.is_draw ? "The task on the line was" : "The loser's task"}
          </p>
          <p className="mt-0.5 break-words text-lg font-bold leading-tight">{game.task}</p>
        </div>
      ) : null}
    </div>
  );
}

const CONFETTI_COLORS = [
  "var(--color-primary)",
  "var(--color-lavender)",
  "var(--color-sky)",
  "var(--color-honey)",
  "var(--color-mint)",
];

/** A small burst of pixel squares for a win. */
function Confetti() {
  return (
    <span className="confetti" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => (
        <i
          key={i}
          style={
            {
              left: `${(i * 37) % 100}%`,
              "--c": CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              "--d": `${(i % 5) * 0.08}s`,
              "--t": `${1.3 + (i % 4) * 0.2}s`,
              "--x": `${((i * 53) % 80) - 40}px`,
              "--r": `${180 + ((i * 97) % 360)}deg`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
