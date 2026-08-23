import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, PrimaryButton, SectionTitle, StreakChip, TextArea } from "@/components/ui-kit";
import { todayISO, useAnswerStreak, useMarkSeen } from "@/lib/badges";
import { useAuthUser, useCoupleId, useMembers } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/questions")({
  head: () => ({
    meta: [
      { title: "Daily Question — BLUBLUB" },
      { name: "description", content: "One question a day — answers reveal once you both reply." },
      { property: "og:title", content: "Daily Question — BLUBLUB" },
      {
        property: "og:description",
        content: "One question a day — answers reveal once you both reply.",
      },
    ],
  }),
  component: QuestionsPage,
});

function QuestionsPage() {
  useMarkSeen("questions");
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: members } = useMembers();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const todayStr = todayISO();
  const [today, setToday] = useState(todayStr);
  const { data: streak } = useAnswerStreak();

  const { data: question } = useQuery({
    queryKey: ["daily-question", today],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").order("day_index");
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const dayNumber = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86_400_000);
      return data[dayNumber % data.length]!;
    },
  });

  const { data: answers } = useQuery({
    queryKey: ["answers", coupleId, question?.id, today],
    enabled: !!coupleId && !!question?.id,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_answers")
        .select("*")
        .eq("couple_id", coupleId!)
        .eq("question_id", question!.id)
        .eq("answer_date", today);

      if (error) throw error;
      // Mark partner answers as seen now that we're looking at this screen.
      const unseen = (data ?? []).filter((a) => a.created_by !== user?.id && !a.seen_by_partner);
      if (unseen.length > 0) {
        await supabase
          .from("question_answers")
          .update({ seen_by_partner: true })
          .in(
            "id",
            unseen.map((a) => a.id),
          );
        void qc.invalidateQueries({ queryKey: ["badges"] });
      }
      return data;
    },
  });

  const mine = answers?.find((a) => a.created_by === user?.id) ?? null;
  const theirs = answers?.find((a) => a.created_by !== user?.id) ?? null;
  const revealed = !!mine && !!theirs;

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("question_answers").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        question_id: question!.id,
        answer_date: today,
        body: draft.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      void qc.invalidateQueries({ queryKey: ["answers"] });
      void qc.invalidateQueries({ queryKey: ["badges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nameOf = (id: string) => members?.find((m) => m.id === id)?.display_name ?? "Partner";

  return (
    <AppLayout title="Daily question" subtitle="One a day, just for you two" critter="cat">
      <Card className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {today === todayStr ? "Today" : "Catching up"}
        </p>
        {streak ? (
          <div className="mt-2">
            <StreakChip days={streak} />
          </div>
        ) : null}
        <p className="mt-2 text-lg font-extrabold">{question?.prompt ?? "Loading…"}</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <input
            type="date"
            value={today}
            max={todayStr}
            onChange={(e) => {
              setToday(e.target.value || todayStr);
              setDraft("");
            }}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold"
          />
          {today !== todayStr ? (
            <button
              type="button"
              onClick={() => {
                setToday(todayStr);
                setDraft("");
              }}
              className="press rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold"
            >
              Back to today
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Missed a day? Pick a date to answer it late.
        </p>
      </Card>

      {!mine ? (
        <Card className="mt-4">
          <TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            placeholder="Your answer stays hidden until you both reply…"
          />
          <div className="mt-3">
            <PrimaryButton
              disabled={!draft.trim() || !question || submit.isPending}
              onClick={() => submit.mutate()}
            >
              Answer
            </PrimaryButton>
          </div>
        </Card>
      ) : (
        <>
          <SectionTitle>Answers</SectionTitle>
          <ul className="space-y-3">
            <li className="card-soft p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">You</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{mine.body}</p>
            </li>
            <li className="card-soft p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {theirs ? nameOf(theirs.created_by) : "Your partner"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {revealed ? theirs!.body : "Hidden until they answer too 🤫"}
              </p>
            </li>
          </ul>
        </>
      )}

      <QuestionArchive today={today} />
    </AppLayout>
  );
}

/** Everything you two have answered before, newest first. */
function QuestionArchive({ today }: { today: string }) {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: members } = useMembers();
  const [open, setOpen] = useState(false);

  const { data: rows } = useQuery({
    queryKey: ["question-archive", coupleId],
    enabled: !!coupleId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_answers")
        .select("*, questions(prompt)")
        .eq("couple_id", coupleId!)
        .order("answer_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const days = (rows ?? [])
    .filter((r) => r.answer_date !== today)
    .reduce<Record<string, typeof rows>>((acc, r) => {
      (acc[r.answer_date] ??= [] as never)!.push(r as never);
      return acc;
    }, {});

  const nameOf = (id: string) =>
    id === user?.id ? "You" : (members?.find((m) => m.id === id)?.display_name ?? "Partner");

  return (
    <>
      <SectionTitle
        action={
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="press rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold"
          >
            {open ? "Hide" : "Open"}
          </button>
        }
      >
        Archive
      </SectionTitle>
      {open ? (
        Object.keys(days).length === 0 ? (
          <Card className="text-sm text-muted-foreground">
            Nothing archived yet — answers appear here the day after.
          </Card>
        ) : (
          <ul className="space-y-3">
            {Object.entries(days).map(([date, entries]) => (
              <li key={date} className="card-soft p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-1 text-sm font-extrabold">
                  {(entries?.[0] as { questions?: { prompt?: string } })?.questions?.prompt ??
                    "Daily question"}
                </p>
                <ul className="mt-2 space-y-2">
                  {(entries ?? []).map((a) => (
                    <li key={a.id} className="rounded-2xl bg-muted/60 px-3 py-2">
                      <p className="text-xs font-bold text-primary">{nameOf(a.created_by)}</p>
                      <p className="whitespace-pre-wrap text-sm">{a.body}</p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </>
  );
}
