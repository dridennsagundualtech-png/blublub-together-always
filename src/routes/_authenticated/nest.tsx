import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BookHeart, ListChecks, Plus, Sparkles, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import {
  Field,
  Money,
  PrimaryButton,
  SelectInput,
  Sheet,
  TextArea,
  TextInput,
} from "@/components/ui-kit";
import { streakFromDates, todayISO } from "@/lib/badges";
import { usePremiumAccess } from "@/lib/admin";
import { useAuthUser, useCoupleId, useMembers } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/nest")({
  head: () => ({
    meta: [
      { title: "Our Nest — BLUBLUB" },
      {
        name: "description",
        content: "Diary, to-dos, bucket list and budget — the whole nest in one place.",
      },
      { property: "og:title", content: "Our Nest — BLUBLUB" },
      {
        property: "og:description",
        content: "Diary, to-dos, bucket list and budget — the whole nest in one place.",
      },
    ],
  }),
  component: NestPage,
});

type QuickKind = null | "choose" | "diary" | "todo" | "bucket" | "expense";
type FilterId = "all" | "diary" | "todo" | "bucket" | "budget";

const MOODS = ["🩷", "😊", "🥹", "😴", "🔥", "😤", "🌧️", "✨"];
const CATEGORIES = ["Food", "Home", "Travel", "Gifts", "Health", "Fun", "Other"] as const;

const FILTERS: { id: FilterId; label: string; icon: typeof BookHeart }[] = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "diary", label: "Diary", icon: BookHeart },
  { id: "todo", label: "To-Dos", icon: ListChecks },
  { id: "bucket", label: "Dreams", icon: Sparkles },
  { id: "budget", label: "Money", icon: Wallet },
];

function NestPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const [quick, setQuick] = useState<QuickKind>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const premium = usePremiumAccess();

  const { data: diary } = useQuery({
    queryKey: ["nest-diary", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diary_entries")
        .select("id,title,body,entry_date")
        .eq("couple_id", coupleId!)
        .order("entry_date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: todos } = useQuery({
    queryKey: ["nest-todos", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("id,done")
        .eq("couple_id", coupleId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bucket } = useQuery({
    queryKey: ["nest-bucket", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bucket_list")
        .select("id,done")
        .eq("couple_id", coupleId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ["nest-expenses", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount,paid_by")
        .eq("couple_id", coupleId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const lastEntry = diary?.[0];
  const diaryStreak = streakFromDates((diary ?? []).map((e) => e.entry_date));
  const openTodos = (todos ?? []).filter((t) => !t.done).length;
  const bucketTotal = bucket?.length ?? 0;
  const bucketDone = (bucket ?? []).filter((b) => b.done).length;
  const balance = (expenses ?? []).reduce((sum, e) => {
    const half = Number(e.amount) / 2;
    return e.paid_by === user?.id ? sum + half : sum - half;
  }, 0);

  const showDiary = filter === "all" || filter === "diary";
  const showTodo = filter === "all" || filter === "todo";
  const showBucket = filter === "all" || filter === "bucket";
  const showBudget = filter === "all" || filter === "budget";

  return (
    <AppLayout title="Our Nest" subtitle="Everything we keep together" critter="cat">
      {/* ===== Sleep Stories style dark panel ===== */}
      <div
        className="relative overflow-hidden px-4 pb-6 pt-5 text-white"
        style={{
          borderRadius: "var(--panel-radius, 1.75rem)",
          background: "linear-gradient(180deg, var(--grad-panel-from, #2A1F3D), var(--grad-panel-to, #1A1528))",
        }}
      >
        {/* soft glow blobs */}
        <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-[#CDB4DB]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-4 size-28 rounded-full bg-[#FFAFCC]/20 blur-3xl" />
        <div className="pointer-events-none absolute right-16 top-24 size-20 rounded-full bg-[#A2D2FF]/15 blur-2xl" />

        {/* Header */}
        <div className="relative text-center">
          <p className="font-display text-[1.65rem] font-bold leading-tight">Nest Stories</p>
          <p className="mx-auto mt-1 max-w-[17rem] text-[11px] leading-snug text-white/65">
            Soothing tools to keep your shared life cozy and close
          </p>
        </div>

        {/* Filter chips – exact Sleep Stories layout */}
        <div className="relative mt-5 flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className="press flex shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className="grid size-12 place-items-center rounded-full transition-colors"
                  style={{
                    backgroundColor: active ? "#FFAFCC" : "rgba(255,255,255,0.12)",
                    color: active ? "#3F2A3A" : "rgba(255,255,255,0.85)",
                  }}
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-[10px] font-semibold text-white/80">{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Featured card */}
        {showDiary && (
          <Link
            to="/diary"
            className="press relative mt-5 block overflow-hidden p-5"
            style={{
              borderRadius: "1.35rem",
              background: "linear-gradient(135deg, #CDB4DB 0%, #FFAFCC 100%)",
              color: "#3F2A3A",
            }}
          >
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Featured</p>
              <p className="mt-1 font-display text-xl font-bold">Shared Diary</p>
              <p className="mt-1 max-w-[14rem] text-xs leading-snug opacity-80">
                {lastEntry
                  ? `Latest: ${(lastEntry.title || lastEntry.body).slice(0, 48)}`
                  : "Write a small note for each other tonight"}
              </p>
              <span
                className="mt-4 inline-flex rounded-full bg-white px-5 py-1.5 text-xs font-bold"
                style={{ color: "#3F2A3A" }}
              >
                Open
              </span>
            </div>
            <BookHeart className="absolute -bottom-2 -right-2 size-24 opacity-15" />
          </Link>
        )}

        {/* Two smaller cards */}
        <div className="relative mt-3 grid grid-cols-2 gap-3">
          {showTodo && (
            <Link
              to="/todos"
              className="press flex min-h-[140px] flex-col justify-between p-4"
              style={{
                borderRadius: "1.25rem",
                backgroundColor: "#FFC8DD",
                color: "#3F2A3A",
              }}
            >
              <ListChecks className="size-8 opacity-80" />
              <div>
                <p className="font-display text-[15px] font-bold">To-Dos</p>
                <p className="text-[11px] opacity-70">
                  {openTodos === 0 ? "All clear" : `${openTodos} open`}
                </p>
              </div>
            </Link>
          )}
          {showBucket && (
            <Link
              to="/bucket"
              className="press flex min-h-[140px] flex-col justify-between p-4"
              style={{
                borderRadius: "1.25rem",
                backgroundColor: "#CDB4DB",
                color: "#3F2A3A",
              }}
            >
              <Sparkles className="size-8 opacity-80" />
              <div>
                <p className="font-display text-[15px] font-bold">Bucket List</p>
                <p className="text-[11px] opacity-70">
                  {bucketDone}/{bucketTotal} done
                </p>
              </div>
            </Link>
          )}
          {showBudget && (
            <Link
              to="/budget"
              className="press col-span-2 flex min-h-[100px] flex-col justify-between p-4"
              style={{
                borderRadius: "1.25rem",
                backgroundColor: "#BDE0FE",
                color: "#3F2A3A",
              }}
            >
              <Wallet className="size-7 opacity-80" />
              <div>
                <p className="font-display text-[15px] font-bold">Budget</p>
                <p className="text-[11px] opacity-70">
                  {!premium
                    ? "Premium space"
                    : Math.abs(balance) < 0.01
                      ? "All square"
                      : "Shared expenses & goals"}
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Quick summary outside the dark panel */}
      <p className="mb-2 mt-5 font-display text-base font-bold text-foreground">Right now</p>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[1.1rem] bg-[#FFC8DD]/45 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Diary streak</p>
          <p className="mt-0.5 text-sm font-bold">{diaryStreak > 0 ? `${diaryStreak} days` : "Start today"}</p>
        </div>
        <div className="rounded-[1.1rem] bg-[#BDE0FE]/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Open to-dos</p>
          <p className="mt-0.5 text-sm font-bold">{openTodos === 0 ? "None" : openTodos}</p>
        </div>
      </div>

      <button
        type="button"
        aria-label="Quick add"
        onClick={() => setQuick("choose")}
        className="press fixed bottom-28 right-[max(1rem,calc(50%-15rem))] z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-float"
      >
        <Plus className="size-6" />
      </button>

      {quick === "choose" ? (
        <Sheet title="What do you want to add?" onClose={() => setQuick(null)}>
          <div className="grid gap-3">
            <ChoiceRow icon={<BookHeart className="size-5" />} title="Diary entry" onClick={() => setQuick("diary")} />
            <ChoiceRow icon={<ListChecks className="size-5" />} title="To-do" onClick={() => setQuick("todo")} />
            <ChoiceRow icon={<Sparkles className="size-5" />} title="Bucket list item" onClick={() => setQuick("bucket")} />
            <ChoiceRow icon={<Wallet className="size-5" />} title="Expense" onClick={() => setQuick("expense")} />
          </div>
        </Sheet>
      ) : null}

      {quick === "diary" ? <QuickDiary onDone={() => setQuick(null)} /> : null}
      {quick === "todo" ? <QuickTodo onDone={() => setQuick(null)} /> : null}
      {quick === "bucket" ? <QuickBucket onDone={() => setQuick(null)} /> : null}
      {quick === "expense" ? <QuickExpense onDone={() => setQuick(null)} /> : null}
    </AppLayout>
  );
}

function ChoiceRow({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press card-soft flex items-center gap-3 p-4 text-left"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
        {icon}
      </span>
      <span className="text-sm font-bold">{title}</span>
    </button>
  );
}

function QuickDiary({ onDone }: { onDone: () => void }) {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState(MOODS[0]!);

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("diary_entries").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        title: title.trim() || null,
        body: body.trim(),
        mood,
        entry_date: todayISO(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["diary"] });
      void qc.invalidateQueries({ queryKey: ["nest-diary"] });
      toast.success("Entry saved");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet title="New diary entry" onClose={onDone}>
      <div className="space-y-3 pb-2">
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={`press size-10 rounded-full text-lg ${mood === m ? "bg-primary/30 ring-2 ring-primary" : "bg-muted"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <Field label="Title (optional)">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </Field>
        <Field label="What happened?">
          <TextArea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        </Field>
        <PrimaryButton disabled={!body.trim() || add.isPending} onClick={() => add.mutate()}>
          Save entry
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function QuickTodo({ onDone }: { onDone: () => void }) {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("todos").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        title: title.trim(),
        done: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["todos"] });
      void qc.invalidateQueries({ queryKey: ["nest-todos"] });
      toast.success("To-do added");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet title="New to-do" onClose={onDone}>
      <div className="space-y-3 pb-2">
        <Field label="What needs doing?">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus />
        </Field>
        <PrimaryButton disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>
          Add to-do
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function QuickBucket({ onDone }: { onDone: () => void }) {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bucket_list").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        title: title.trim(),
        done: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bucket"] });
      void qc.invalidateQueries({ queryKey: ["nest-bucket"] });
      toast.success("Dream added");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet title="New bucket list item" onClose={onDone}>
      <div className="space-y-3 pb-2">
        <Field label="A dream for us">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus />
        </Field>
        <PrimaryButton disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>
          Add dream
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function QuickExpense({ onDone }: { onDone: () => void }) {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const members = useMembers();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [paidBy, setPaidBy] = useState(user?.id ?? "");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({
        couple_id: coupleId!,
        amount: Number(amount),
        category,
        note: note.trim() || null,
        paid_by: paidBy,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      void qc.invalidateQueries({ queryKey: ["nest-expenses"] });
      toast.success("Expense logged");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet title="Log expense" onClose={onDone}>
      <div className="space-y-3 pb-2">
        <Field label="Amount">
          <TextInput
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="Category">
          <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Paid by">
          <SelectInput value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {(members ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name ?? "Partner"}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Note (optional)">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} />
        </Field>
        <PrimaryButton
          disabled={!amount || Number(amount) <= 0 || add.isPending}
          onClick={() => add.mutate()}
        >
          Save expense
        </PrimaryButton>
      </div>
    </Sheet>
  );
}
