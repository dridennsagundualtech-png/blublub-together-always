import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, PrimaryButton, SectionTitle, TextArea, TextInput } from "@/components/ui-kit";
import { useAuthUser, useCoupleId } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/dates")({
  head: () => ({
    meta: [
      { title: "Date Night Planner — BLUBLUB" },
      { name: "description", content: "Suggest date ideas, plan nights out and keep private notes." },
      { property: "og:title", content: "Date Night Planner — BLUBLUB" },
      {
        property: "og:description",
        content: "Suggest date ideas, plan nights out and keep private notes.",
      },
    ],
  }),
  component: DatesPage,
});

function DatesPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [plannedFor, setPlannedFor] = useState("");
  const [intimate, setIntimate] = useState(false);

  const { data: ideas } = useQuery({
    queryKey: ["date-ideas", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("date_ideas")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("date_ideas").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        title: title.trim(),
        notes: notes.trim() || null,
        planned_for: plannedFor || null,
        is_private_note: intimate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setNotes("");
      setPlannedFor("");
      void qc.invalidateQueries({ queryKey: ["date-ideas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDone = useMutation({
    mutationFn: async (d: { id: string; done: boolean }) => {
      const { error } = await supabase.from("date_ideas").update({ done: !d.done }).eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["date-ideas"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("date_ideas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["date-ideas"] }),
  });

  const list = ideas ?? [];
  const planned = list.filter((d) => d.planned_for && !d.done && !d.is_private_note);
  const wishlist = list.filter((d) => !d.planned_for && !d.done && !d.is_private_note);
  const privateNotes = list.filter((d) => d.is_private_note);

  return (
    <AppLayout title="Date nights" subtitle="Plan something lovely" critter="cat">
      <Card>
        <div className="space-y-3">
          <Field label="Idea">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              placeholder="Picnic + sunset walk"
            />
          </Field>
          <Field label="Notes">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </Field>
          <Field label="Planned for (optional)">
            <TextInput
              type="date"
              value={plannedFor}
              onChange={(e) => setPlannedFor(e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={intimate}
              onChange={(e) => setIntimate(e.target.checked)}
              className="size-4 accent-primary"
            />
            Save under private intimacy notes
          </label>
          <PrimaryButton disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>
            Add idea
          </PrimaryButton>
        </div>
      </Card>

      <Section title="Planned nights" items={planned} onToggle={toggleDone.mutate} onRemove={remove.mutate} />
      <Section title="Idea wishlist" items={wishlist} onToggle={toggleDone.mutate} onRemove={remove.mutate} />

      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Lock className="size-4" /> Private notes
        </span>
      </SectionTitle>
      {privateNotes.length === 0 ? (
        <Card className="text-sm text-muted-foreground">
          Just for the two of you — planning, moods, things you&apos;d like to try together.
        </Card>
      ) : (
        <ul className="space-y-2">
          {privateNotes.map((d) => (
            <li key={d.id} className="card-soft p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold">{d.title}</p>
                <button
                  aria-label="Delete note"
                  onClick={() => remove.mutate(d.id)}
                  className="press rounded-full p-1 text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {d.notes ? <p className="mt-1 whitespace-pre-wrap text-sm">{d.notes}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}

type Idea = {
  id: string;
  title: string;
  notes: string | null;
  planned_for: string | null;
  done: boolean;
};

function Section({
  title,
  items,
  onToggle,
  onRemove,
}: {
  title: string;
  items: Idea[];
  onToggle: (d: { id: string; done: boolean }) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      {items.length === 0 ? (
        <Card className="text-sm text-muted-foreground">Nothing here yet.</Card>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id} className="card-soft flex items-start gap-3 p-4">
              <button
                aria-label="Mark done"
                onClick={() => onToggle({ id: d.id, done: d.done })}
                className="press mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 border-border"
              >
                <Check className="size-4 opacity-30" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{d.title}</p>
                {d.planned_for ? (
                  <p className="text-xs text-muted-foreground">{d.planned_for}</p>
                ) : null}
                {d.notes ? <p className="mt-1 whitespace-pre-wrap text-sm">{d.notes}</p> : null}
              </div>
              <button
                aria-label="Delete idea"
                onClick={() => onRemove(d.id)}
                className="press rounded-full p-1 text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
