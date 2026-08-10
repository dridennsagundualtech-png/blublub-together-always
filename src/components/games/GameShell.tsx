import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Doodle } from "@/components/Doodles";
import { Card, Field, PrimaryButton, TextInput } from "@/components/ui-kit";
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

  if (isLoading) return <Card className="text-sm text-muted-foreground">Loading…</Card>;

  if (game && seats.me) {
    return (
      <>{children({ game, me: seats.me, seat: seats.seat as 0 | 1, players: seats.players, nameOf: seats.nameOf })}</>
    );
  }

  const showResult = lastDone && !dismissed.includes(lastDone.id);

  return (
    <>
      {showResult ? <ResultCard game={lastDone} nameOf={seats.nameOf} me={seats.me} /> : null}

      <Card className={showResult ? "mt-4" : ""}>
        <div className="space-y-3">
          <p className="text-sm font-bold">{GAME_META[kind].label}</p>
          <Field label="Task for the loser">
            <TextInput
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. make coffee tomorrow"
              maxLength={200}
            />
          </Field>
          <PrimaryButton
            disabled={!task.trim() || create.isPending}
            onClick={() => {
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
            Lock in task & start
          </PrimaryButton>
          <p className="text-xs text-muted-foreground">
            The task is locked before the game starts — the loser has to do it.
          </p>
        </div>
      </Card>
    </>
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
  return (
    <div className="card-soft relative overflow-hidden p-6 text-center">
      <Doodle
        critter={iLost ? "seal" : "penguin"}
        pose={iLost ? "sleep" : "wave"}
        size={64}
        className="absolute -right-2 -top-2 opacity-50"
      />
      <p className="text-2xl font-extrabold">
        {game.is_draw ? "It's a draw!" : iLost ? "You lost!" : "You won!"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {game.is_draw ? "Nobody owes anything 🩷" : `${nameOf(game.winner_id)} took the win`}
      </p>
      {game.task ? (
        <div className="mt-4 rounded-2xl bg-accent px-4 py-3 text-accent-foreground">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            {game.is_draw ? "The task on the line was" : "The loser's task"}
          </p>
          <p className="mt-1 text-base font-extrabold">{game.task}</p>
        </div>
      ) : null}
    </div>
  );
}
