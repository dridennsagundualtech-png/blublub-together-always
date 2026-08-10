import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, PrimaryButton, SectionTitle, StreakChip, TextArea, TextInput } from "@/components/ui-kit";
import { streakFromDates, todayISO, useMarkSeen } from "@/lib/badges";
import { useAuthUser, useCoupleId, useMembers } from "@/lib/session";

const MOODS = ["🩷", "😊", "🥹", "😴", "🔥", "😤", "🌧️", "✨"];

export const Route = createFileRoute("/_authenticated/diary")({
  head: () => ({
    meta: [
      { title: "Couple Diary — BLUBLUB" },
      { name: "description", content: "A shared journal with dated entries and mood tags." },
      { property: "og:title", content: "Couple Diary — BLUBLUB" },
      { property: "og:description", content: "A shared journal with dated entries and mood tags." },
    ],
  }),
  component: DiaryPage,
});

function DiaryPage() {
  useMarkSeen("diary");
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: members } = useMembers();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState(MOODS[0]!);
  const [date, setDate] = useState(todayISO());

  const { data: entries } = useQuery({
    queryKey: ["diary", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diary_entries")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("diary_entries").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        title: title.trim() || null,
        body: body.trim(),
        mood,
        entry_date: date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      void qc.invalidateQueries({ queryKey: ["diary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const streak = streakFromDates((entries ?? []).map((e) => e.entry_date));

  const nameOf = (id: string) => members?.find((m) => m.id === id)?.display_name ?? "Someone";

  return (
    <AppLayout title="Diary" subtitle="Your shared journal" critter="seal">
      <Card>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m)}
                className={`press grid size-10 place-items-center rounded-2xl text-lg ${
                  mood === m ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <Field label="Title (optional)">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="Entry">
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={4000}
              placeholder="Today felt like…"
            />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <PrimaryButton disabled={!body.trim() || add.isPending} onClick={() => add.mutate()}>
            Save entry
          </PrimaryButton>
        </div>
      </Card>

      <SectionTitle action={streak ? <StreakChip days={streak} /> : undefined}>Entries</SectionTitle>
      {!entries || entries.length === 0 ? (
        <Card className="text-sm text-muted-foreground">No entries yet.</Card>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="card-soft p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">
                  <span className="mr-2 text-lg">{e.mood}</span>
                  {e.title ?? "Untitled"}
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">{e.entry_date}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{e.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">— {nameOf(e.created_by)}</p>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
