import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Doodle } from "@/components/Doodles";
import { useCouple, useCoupleId } from "@/lib/session";
import {
  ACCENTS,
  THEMES,
  applyAppearance,
  loadAppearanceLocal,
  readAppearance,
  saveAppearanceLocal,
  type Appearance,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/appearance")({
  head: () => ({
    meta: [
      { title: "Appearance — BLUBLUB" },
      { name: "description", content: "Pick a theme and an accent colour for both of you." },
      { property: "og:title", content: "Appearance — BLUBLUB" },
      {
        property: "og:description",
        content: "Pick a theme and an accent colour for both of you.",
      },
    ],
  }),
  component: AppearancePage,
});

function AppearancePage() {
  const coupleId = useCoupleId();
  const { data: couple } = useCouple();
  const qc = useQueryClient();
  const saved = (couple as { theme?: unknown } | null | undefined)?.theme;
  const [current, setCurrent] = useState<Appearance>(() =>
    saved ? readAppearance(saved) : loadAppearanceLocal(),
  );

  async function choose(next: Appearance) {
    setCurrent(next);
    applyAppearance(next);
    saveAppearanceLocal(next);
    if (!coupleId) return;
    const { error } = await supabase
      .from("couples")
      .update({ theme: JSON.stringify(next) })
      .eq("id", coupleId);
    if (error) {
      toast.error("Couldn't save for your partner — check your connection and try again.");
      return;
    }
    void qc.invalidateQueries({ queryKey: ["couple", coupleId] });
  }

  return (
    <AppLayout title="Appearance" subtitle="Changes apply for both of you" critter="cat" critterPose="love">
      <section aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="mb-2 px-1 font-display text-lg font-bold">
          Theme
        </h2>
        <div role="radiogroup" aria-labelledby="theme-heading" className="grid grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const on = current.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => void choose({ theme: t.id, accent: t.accent })}
                className={cn(
                  "card-soft press flex min-h-24 flex-col justify-between gap-3 p-3 text-left",
                  on && "ring-2 ring-primary-ink",
                )}
              >
                <span className="flex h-10 overflow-hidden rounded-xl">
                  {t.swatch.map((c) => (
                    <span key={c} className="flex-1" style={{ background: c }} />
                  ))}
                </span>
                <span className="flex items-center justify-between text-sm font-bold">
                  {t.name}
                  {on ? <Check className="size-4 text-primary-ink" aria-hidden /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="accent-heading" className="mt-7">
        <h2 id="accent-heading" className="mb-2 px-1 font-display text-lg font-bold">
          Accent colour
        </h2>
        <div
          role="radiogroup"
          aria-labelledby="accent-heading"
          className="card-soft flex flex-wrap gap-2 p-3"
        >
          {ACCENTS.map((a) => {
            const on = current.accent === a.hex;
            return (
              <button
                key={a.hex}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={a.name}
                onClick={() => void choose({ ...current, accent: a.hex })}
                className={cn(
                  "press grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-card",
                  on && "ring-2 ring-primary-ink",
                )}
                style={{ background: a.hex }}
              >
                {on ? <Check className="size-4 text-primary-foreground" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-7" aria-label="Preview">
        <h2 className="mb-2 px-1 font-display text-lg font-bold">Preview</h2>
        <div className="card-soft flex items-center gap-4 p-4">
          <Doodle critter="penguin" pose="cheer" size={72} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">This is how it looks</p>
            <p className="text-xs text-muted-foreground">
              Text, links and buttons stay easy to read in every combination.
            </p>
            <p className="mt-2 text-xs font-bold text-primary-ink">A link looks like this</p>
          </div>
        </div>
        <div className="mt-3 rounded-full bg-primary px-5 py-3.5 text-center text-sm font-bold text-primary-foreground">
          A main button
        </div>
      </section>

      {!coupleId ? (
        <p className="mt-4 px-1 text-xs text-muted-foreground">
          Saved on this phone. Pair with your partner to share it.
        </p>
      ) : null}
    </AppLayout>
  );
}
