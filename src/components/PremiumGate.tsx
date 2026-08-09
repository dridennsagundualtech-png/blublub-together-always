import type { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Doodle } from "@/components/Doodles";
import { playChirp } from "@/hooks/use-sound";

/**
 * Wraps any feature. When `unlocked` is false it renders an upgrade prompt
 * instead of the feature. Generic on purpose so it can gate anything.
 */
export function PremiumGate({
  unlocked,
  title,
  blurb,
  children,
  onUpgrade,
}: {
  unlocked: boolean;
  title: string;
  blurb?: string;
  children: ReactNode;
  onUpgrade?: () => void;
}) {
  if (unlocked) return <>{children}</>;

  return (
    <div className="card-soft relative overflow-hidden p-6 text-center">
      <Doodle critter="seal" size={64} className="absolute -right-2 -top-2 opacity-40" />
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">
        <Lock className="size-6" />
      </div>
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {blurb ?? "This is part of BLUBLUB Premium. Unlock it to keep everything in one cozy place."}
      </p>
      <button
        type="button"
        onClick={() => {
          playChirp("tap");
          onUpgrade?.();
        }}
        className="press mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-soft"
      >
        <Sparkles className="size-4" />
        Unlock Premium
      </button>
      <p className="mt-3 text-xs text-muted-foreground">Purchases arrive in a later update.</p>
    </div>
  );
}
