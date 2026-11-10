import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { finishPatch, useUpdateGame, type GameRow } from "@/lib/games";
import { playChirp } from "@/hooks/use-sound";
import { cn } from "@/lib/utils";

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
  // Giving up costs the game (and the task), so it takes two taps: the first one only asks.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(t);
  }, [armed]);

  return (
    <div className="px-frame px-frame--flat px-tint-muted flex items-center gap-2 p-3">
      <div className="min-w-0 flex-1">
        <p className="px-label">Loser's task</p>
        <p className="truncate text-base font-bold leading-tight">{game.task}</p>
        <p className="mt-0.5 text-sm leading-tight" aria-live="polite">
          {status}
        </p>
      </div>
      <button
        type="button"
        aria-label={armed ? "Tap again to give up" : "Give up"}
        className={cn("px-btn px-btn--small shrink-0", armed ? "px-btn--danger" : "px-btn--ghost")}
        disabled={update.isPending}
        onClick={() => {
          playChirp("pop");
          if (!armed) {
            setArmed(true);
            return;
          }
          setArmed(false);
          update.mutate(
            { id: game.id, patch: finishPatch(onResignTo ?? null) as never },
            { onError: (e: Error) => toast.error(e.message) },
          );
        }}
      >
        <Flag className="size-4" />
        {armed ? <span>Give up?</span> : null}
      </button>
    </div>
  );
}
