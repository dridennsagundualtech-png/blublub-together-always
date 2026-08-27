import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

type QuestionRow = {
  id: string;
  prompt: string;
  day_index?: number | null;
  occasion?: string | null;
};

/** Who the day is special for — anniversary / birthdays. */
type OccasionCtx = {
  anniversary?: string | null;
  myBirthday?: string | null;
  partnerBirthday?: string | null;
};

function dayNumberFor(date: string) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

const mmdd = (iso?: string | null) => (iso ? iso.slice(5, 10) : null);

function useQuestionBank() {
  return useQuery({
    queryKey: ["question-bank"],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").order("day_index");
      if (error) throw error;
      return (data ?? []) as QuestionRow[];
    },
  });
}

/** Keys of the special buckets that apply to this date, most specific first. */
function occasionKeysFor(date: string, ctx?: OccasionCtx) {
  const keys: string[] = [];
  const d = mmdd(date);
  if (ctx?.myBirthday && mmdd(ctx.myBirthday) === d) keys.push("birthday");
  if (ctx?.partnerBirthday && mmdd(ctx.partnerBirthday) === d) keys.push("partner-birthday");
  if (ctx?.anniversary && mmdd(ctx.anniversary) === d) keys.push("anniversary");
  if (d) keys.push(d);
  return keys;
}

function questionFor(bank: QuestionRow[] | undefined, date: string, ctx?: OccasionCtx) {
  if (!bank || bank.length === 0) return null;
  const n = dayNumberFor(date);
  for (const key of occasionKeysFor(date, ctx)) {
    const pool = bank.filter((q) => q.occasion === key);
    if (pool.length > 0) return pool[Math.abs(Math.floor(n / 365)) % pool.length]!;
  }
  const general = bank.filter((q) => !q.occasion);
  const pool = general.length > 0 ? general : bank;
  return pool[((n % pool.length) + pool.length) % pool.length]!;
}

function QuestionsPage() {
  useMarkSeen("questions");
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: members } = useMembers();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const today = todayISO();
  const { data: streak } = useAnswerStreak();
  const { data: bank } = useQuestionBank();
  const me = members?.find((m) => m.id === user?.id);
  const partner = members?.find((m) => m.id !== user?.id);
  const occasionCtx: OccasionCtx = {
    anniversary: me?.anniversary_date ?? partner?.anniversary_date ?? null,
    myBirthday: me?.birthday ?? null,
    partnerBirthday: partner?.birthday ?? null,
  };
  const question = questionFor(bank, today, occasionCtx);


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
      void qc.invalidateQueries({ queryKey: ["question-archive"] });
      void qc.invalidateQueries({ queryKey: ["badges"] });
      void awardPoint("question").then((won) => {
        if (won) toast.success("+1 Love Point 💗");
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nameOf = (id: string) => members?.find((m) => m.id === id)?.display_name ?? "Partner";

  return (
    <AppLayout title="Daily question" subtitle="One a day, just for you two" critter="cat">
      <Card className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Today</p>
        {streak ? (
          <div className="mt-2">
            <StreakChip days={streak} />
          </div>
        ) : null}
        <p className="mt-2 text-lg font-extrabold">{question?.prompt ?? "Loading…"}</p>
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

const ARCHIVE_DAYS = 30;

/** Past days, split into ones you answered and ones you still can catch up on. */
function QuestionArchive({ today }: { today: string }) {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: members } = useMembers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"answered" | "missed">("answered");
  const { data: bank } = useQuestionBank();
  const occasionCtx: OccasionCtx = {
    anniversary: members?.find((m) => m.anniversary_date)?.anniversary_date ?? null,
    myBirthday: members?.find((m) => m.id === user?.id)?.birthday ?? null,
    partnerBirthday: members?.find((m) => m.id !== user?.id)?.birthday ?? null,
  };

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

  const pastDates = useMemo(() => {
    const out: string[] = [];
    const base = Date.parse(`${today}T00:00:00Z`);
    for (let i = 1; i <= ARCHIVE_DAYS; i++) {
      out.push(new Date(base - i * 86_400_000).toISOString().slice(0, 10));
    }
    return out;
  }, [today]);

  const byDate = useMemo(() => {
    const map: Record<string, NonNullable<typeof rows>> = {};
    for (const r of rows ?? []) (map[r.answer_date] ??= [] as never).push(r as never);
    return map;
  }, [rows]);

  const answeredDates = pastDates.filter((d) =>
    (byDate[d] ?? []).some((a) => a.created_by === user?.id),
  );
  const missedDates = pastDates.filter(
    (d) => !(byDate[d] ?? []).some((a) => a.created_by === user?.id),
  );

  const nameOf = (id: string) =>
    id === user?.id ? "You" : (members?.find((m) => m.id === id)?.display_name ?? "Partner");

  const fmt = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const answerLate = useMutation({
    mutationFn: async (v: { date: string; questionId: string; body: string }) => {
      const { error } = await supabase.from("question_answers").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        question_id: v.questionId,
        answer_date: v.date,
        body: v.body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["question-archive"] });
      void qc.invalidateQueries({ queryKey: ["badges"] });
      toast.success("Caught up 💗");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        <>
          <div className="mb-3 flex gap-2">
            {(["answered", "missed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={
                  "press rounded-full border border-border px-3 py-1.5 text-xs font-bold " +
                  (tab === t ? "bg-primary text-primary-foreground" : "bg-card")
                }
              >
                {t === "answered"
                  ? `Answered (${answeredDates.length})`
                  : `Not answered (${missedDates.length})`}
              </button>
            ))}
          </div>

          {tab === "answered" ? (
            answeredDates.length === 0 ? (
              <Card className="text-sm text-muted-foreground">
                Nothing archived yet — answers appear here the day after.
              </Card>
            ) : (
              <ul className="space-y-3">
                {answeredDates.map((date) => (
                  <li key={date} className="card-soft p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {fmt(date)}
                    </p>
                    <p className="mt-1 text-sm font-extrabold">
                      {(byDate[date]?.[0] as { questions?: { prompt?: string } } | undefined)
                        ?.questions?.prompt ??
                        questionFor(bank, date, occasionCtx)?.prompt ??
                        "Daily question"}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {(byDate[date] ?? []).map((a) => (
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
          ) : missedDates.length === 0 ? (
            <Card className="text-sm text-muted-foreground">
              You&apos;re all caught up — no missed questions 🎉
            </Card>
          ) : (
            <ul className="space-y-3">
              {missedDates.map((date) => (
                <MissedDay
                  key={date}
                  date={date}
                  label={fmt(date)}
                  prompt={questionFor(bank, date, occasionCtx)?.prompt ?? "Daily question"}
                  questionId={questionFor(bank, date, occasionCtx)?.id ?? null}
                  partnerAnswered={(byDate[date] ?? []).length > 0}
                  pending={answerLate.isPending}
                  onSubmit={(body, questionId) => answerLate.mutate({ date, questionId, body })}
                />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </>
  );
}

function MissedDay({
  label,
  prompt,
  questionId,
  partnerAnswered,
  pending,
  onSubmit,
}: {
  date: string;
  label: string;
  prompt: string;
  questionId: string | null;
  partnerAnswered: boolean;
  pending: boolean;
  onSubmit: (body: string, questionId: string) => void;
}) {
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <li className="card-soft p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-extrabold">{prompt}</p>
      {partnerAnswered ? (
        <p className="mt-1 text-xs text-primary">Your partner already answered this one 💌</p>
      ) : null}
      {open ? (
        <div className="mt-2">
          <TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            placeholder="Answer it now…"
          />
          <div className="mt-2">
            <PrimaryButton
              disabled={!body.trim() || !questionId || pending}
              onClick={() => questionId && onSubmit(body, questionId)}
            >
              Save answer
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press mt-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold"
        >
          Answer late
        </button>
      )}
    </li>
  );
}
