import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  EmptyState,
  Field,
  PrimaryButton,
  ProgressBar,
  SectionTitle,
  TextInput,
} from "@/components/ui-kit";
import { playChirp } from "@/hooks/use-sound";
import { todayISO } from "@/lib/badges";
import { useAuthUser, useCoupleId } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/bucket")({
  head: () => ({
    meta: [
      { title: "Bucket List — BLUBLUB" },
      { name: "description", content: "Everything you want to do together, ticked off as a pair." },
      { property: "og:title", content: "Bucket List — BLUBLUB" },
      {
        property: "og:description",
        content: "Everything you want to do together, ticked off as a pair.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BucketPage,
});

function BucketPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");

  const { data: items } = useQuery({
    queryKey: ["bucket", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bucket_list")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("done")
        .order("target_date", { nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bucket_list").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        title: title.trim(),
        target_date: target || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setTarget("");
      void qc.invalidateQueries({ queryKey: ["bucket"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (row: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("bucket_list")
        .update({ done: !row.done, done_on: row.done ? null : todayISO() })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["bucket"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bucket_list").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["bucket"] }),
  });

  const rows = items ?? [];
  const doneCount = rows.filter((r) => r.done).length;

  return (
    <AppLayout title="Bucket list" subtitle="Someday, together" critter="seal" critterPose="peek">
      <Card>
        <div className="space-y-3">
          <Field label="Something to do together">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="See the northern lights"
              maxLength={140}
            />
          </Field>
          <Field label="Target date (optional)">
            <TextInput type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
          </Field>
          <PrimaryButton disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>
            Add to the list
          </PrimaryButton>
        </div>
      </Card>

      {rows.length > 0 ? (
        <Card className="mt-4">
          <p className="text-sm font-bold">
            {doneCount} of {rows.length} ticked off
          </p>
          <div className="mt-2">
            <ProgressBar value={(doneCount / rows.length) * 100} />
          </div>
        </Card>
      ) : null}

      <SectionTitle>The list</SectionTitle>
      {rows.length === 0 ? (
        <EmptyState text="Nothing here yet — dream a little." />
      ) : (
        <ul className="space-y-2 pb-4">
          {rows.map((r) => (
            <li key={r.id} className="card-soft flex items-center gap-3 p-4">
              <button
                type="button"
                aria-label={r.done ? "Mark as not done" : "Mark as done together"}
                onClick={() => {
                  playChirp(r.done ? "tap" : "success");
                  toggle.mutate({ id: r.id, done: r.done });
                }}
                className={`press grid size-8 shrink-0 place-items-center rounded-full ${
                  r.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Check className="size-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-bold ${r.done ? "line-through opacity-60" : ""}`}>
                  {r.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.done
                    ? `Done ${r.done_on ?? ""}`.trim()
                    : r.target_date
                      ? `Hoping for ${r.target_date}`
                      : "No date yet"}
                </p>
              </div>
              <button
                aria-label="Delete item"
                onClick={() => remove.mutate(r.id)}
                className="press rounded-full p-1 text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
