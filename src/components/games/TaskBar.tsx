import { toast } from "sonner";
import { Flag } from "lucide-react";
import { finishPatch, useUpdateGame, type GameRow } from "@/lib/games";
import { playChirp } from "@/hooks/use-sound";

/** Shows the locked-in loser task plus whose move it is. */
export function TaskBar({
  game,
  status,
  onResignTo,
}: {
  game: GameRow;
  status: string;
  onResignTo?: string | null;
}) {
  const update = useUpdateGame();
  return (
    <div className="card-soft flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Loser's task
        </p>
        <p className="truncate text-sm font-extrabold">{game.task}</p>
        <p className="mt-1 text-xs text-primary">{status}</p>
      </div>
      <button
        type="button"
        aria-label="Give up"
        className="press grid size-9 shrink-0 place-items-center rounded-full bg-muted"
        onClick={() => {
          playChirp("pop");
          update.mutate(
            { id: game.id, patch: finishPatch(onResignTo ?? null) as never },
            { onError: (e: Error) => toast.error(e.message) },
          );
        }}
      >
        <Flag className="size-4" />
      </button>
    </div>
  );
}
