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

function SummaryTile({
  tint,
  icon,
  label,
  value,
  detail,
}: {
  tint: string;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className={`grad-box card-soft rounded-[1.25rem] ${tint} p-4`}>
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-card/70">{icon}</span>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 font-display text-base font-bold text-foreground">{value}</p>
      {detail ? <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

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
      <p className="mb-3 font-display text-lg font-bold text-foreground">Right now</p>
      <div className="grid gap-3">
        <SummaryTile
          tint="tile-lilac"
          icon={<BookHeart className="size-3.5 text-primary" />}
          label="Diary"
          value={lastEntry ? (lastEntry.title || lastEntry.body).slice(0, 60) : "No entries yet"}
          detail={diaryStreak > 0 ? `${diaryStreak}-day streak` : "Write something small today"}
        />
        <div className="grid grid-cols-2 gap-3">
          <SummaryTile
            tint="tile-pink"
            icon={<ListChecks className="size-3.5 text-primary" />}
            label="To-Dos"
            value={openTodos === 0 ? "All done" : `${openTodos} left to do`}
          />
          <SummaryTile
            tint="tile-peach"
            icon={<Sparkles className="size-3.5 text-primary" />}
            label="Bucket List"
            value={`${bucketDone}/${bucketTotal} done`}
          />
        </div>
        <SummaryTile
          tint="tile-sky"
          icon={<Wallet className="size-3.5 text-primary" />}
          label="Budget"
          value={
            !premium ? (
              "Premium space"
            ) : Math.abs(balance) < 0.01 ? (
              "All square"
            ) : (
              <>
                <Money value={Math.abs(balance)} /> {balance > 0 ? "owed to you" : "you owe"}
              </>
            )
          }
        />
      </div>

      <div className="panel-dark relative mt-6 px-4 pb-5 pt-6">
        <div className="relative text-center">
          <p className="font-display text-2xl font-bold">Nest tools</p>
          <p className="mx-auto mt-1 max-w-[16rem] text-xs text-white/70">
            Diary, lists, dreams and money — kept in one cozy place
          </p>
        </div>

        <Link
          to="/diary"
          className="featured-gradient press relative mt-5 block overflow-hidden rounded-[1.35rem] p-5 text-primary-foreground"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Featured</p>
          <p className="mt-1 font-display text-xl font-bold">Shared Diary</p>
          <p className="mt-1 max-w-[14rem] text-xs opacity-90">
            {lastEntry
              ? `Latest: ${(lastEntry.title || lastEntry.body).slice(0, 42)}`
              : "Write a small note for each other"}
          </p>
          <span className="mt-4 inline-flex rounded-full bg-card px-4 py-1.5 text-xs font-bold text-card-foreground">
            Open
          </span>
          <BookHeart className="absolute bottom-4 right-4 size-14 opacity-20" />
        </Link>

        <div className="relative mt-3 grid grid-cols-2 gap-3">
          <Link
            to="/todos"
            className="grad-box press flex min-h-[130px] flex-col justify-between rounded-[1.25rem] tile-pink p-4 text-foreground"
          >
            <ListChecks className="size-7 text-primary opacity-80" />
            <div>
              <p className="font-display text-base font-bold">To-Dos</p>
              <p className="text-[11px] text-muted-foreground">
                {openTodos === 0 ? "All clear" : `${openTodos} open`}
              </p>
            </div>
          </Link>
          <Link
            to="/bucket"
            className="grad-box press flex min-h-[130px] flex-col justify-between rounded-[1.25rem] tile-peach p-4 text-foreground"
          >
            <Sparkles className="size-7 text-primary opacity-80" />
            <div>
              <p className="font-display text-base font-bold">Bucket List</p>
              <p className="text-[11px] text-muted-foreground">
                {bucketDone}/{bucketTotal} done
              </p>
            </div>
          </Link>
          <Link
            to="/budget"
            className="grad-box press col-span-2 flex min-h-[100px] flex-col justify-between rounded-[1.25rem] tile-cream p-4 text-foreground"
          >
            <Wallet className="size-6 text-primary opacity-80" />
            <div>
              <p className="font-display text-base font-bold">Budget</p>
              <p className="text-[11px] text-muted-foreground">
                {!premium
                  ? "Premium space"
                  : Math.abs(balance) < 0.01
                    ? "All square"
                    : "Shared expenses & goals"}
              </p>
            </div>
          </Link>
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
        description: note.trim() || category,
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
            {(members.data ?? []).map((m) => (
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
