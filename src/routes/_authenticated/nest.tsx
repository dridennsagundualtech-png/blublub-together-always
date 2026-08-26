import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BookHeart, ListChecks, Plus, Sparkles, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  Field,
  Money,
  PrimaryButton,
  SelectInput,
  Sheet,
  StreakChip,
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

const MOODS = ["🩷", "😊", "🥹", "😴", "🔥", "😤", "🌧️", "✨"];
const CATEGORIES = ["Food", "Home", "Travel", "Gifts", "Health", "Fun", "Other"] as const;

function NestPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const [quick, setQuick] = useState<QuickKind>(null);
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

  return (
    <AppLayout title="Our Nest" subtitle="Everything we keep together" critter="cat">
      <SectionTitle>Right now</SectionTitle>
      <div className="grid gap-3">
        <SummaryTile
          tint="tile-lilac"
          icon={<BookHeart className="size-3.5 text-primary" />}
          label="Diary"
          value={lastEntry ? (lastEntry.title || lastEntry.body).slice(0, 60) : "No entries yet"}
          detail={diaryStreak > 0 ? `${diaryStreak}-day streak 🔥` : "Write something small today"}
        />
        <div className="grid grid-cols-2 gap-3">
          <SummaryTile
            tint="tile-pink"
            icon={<ListChecks className="size-3.5 text-primary" />}
            label="To-Dos"
            value={openTodos === 0 ? "All done 🩷" : `${openTodos} left to do`}
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
              "All square 🩷"
            ) : (
              <>
                <Money value={Math.abs(balance)} /> {balance > 0 ? "owed to you" : "you owe"}
              </>
            )
          }
        />
      </div>

      <SectionTitle>Nest tools</SectionTitle>
      <ul className="space-y-3">
        <ToolRow to="/diary" tint="tile-lilac" icon={<BookHeart className="size-5" />} label="Diary" hint="Dated entries with a mood" />
        <ToolRow to="/todos" tint="tile-pink" icon={<ListChecks className="size-5" />} label="To-Dos" hint="Our shared checklist" />
        <ToolRow to="/bucket" tint="tile-peach" icon={<Sparkles className="size-5" />} label="Bucket List" hint="Dreams to tick off together" />
        <ToolRow to="/budget" tint="tile-sky" icon={<Wallet className="size-5" />} label="Budget" hint="Expenses, goals and savings" />
      </ul>


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

function Tile({
  to,
  icon,
  tint,
  label,
  value,
  extra,
}: {
  to: string;
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <li>
      <Link to={to} className="card-soft press flex h-full flex-col gap-2 p-4">
        <span className={`grid size-11 place-items-center rounded-2xl ${tint} text-primary`}>
          {icon}
        </span>
        <span className="text-sm font-extrabold">{label}</span>
        <span className="line-clamp-2 text-xs text-muted-foreground">{value}</span>
        {extra}
      </Link>
    </li>
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
      <span className="tile-lilac grid size-11 shrink-0 place-items-center rounded-2xl text-primary">
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
      const { error } = await supabase
        .from("todos")
        .insert({ couple_id: coupleId!, created_by: user!.id, title: title.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["todos"] });
      void qc.invalidateQueries({ queryKey: ["nest-todos"] });
      toast.success("Added to the list");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet title="New to-do" onClose={onDone}>
      <div className="space-y-3 pb-2">
        <Field label="What needs doing?">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder="Buy groceries"
          />
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
  const [notes, setNotes] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bucket_list").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        title: title.trim(),
        notes: notes.trim() || null,
        target_date: targetDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bucket"] });
      void qc.invalidateQueries({ queryKey: ["nest-bucket"] });
      void qc.invalidateQueries({ queryKey: ["derived-dates"] });
      toast.success("Added to the bucket list");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet title="New bucket list item" onClose={onDone}>
      <div className="space-y-3 pb-2">
        <Field label="Dream">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder="See the northern lights"
          />
        </Field>
        <Field label="Notes (optional)">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </Field>
        <Field label="Target date (optional)">
          <TextInput type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
        <PrimaryButton disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>
          Add to bucket list
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function QuickExpense({ onDone }: { onDone: () => void }) {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: members } = useMembers();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const premium = usePremiumAccess();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("expenses").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        paid_by: paidBy || user!.id,
        description: description.trim(),
        category,
        amount: value,
        spent_on: todayISO(),
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

  if (!premium) {
    return (
      <Sheet title="Expense" onClose={onDone}>
        <Card className="text-sm text-muted-foreground">
          The budget tracker is a premium space. Unlock it to log expenses.
        </Card>
        <PrimaryButton
          className="mt-3"
          onClick={() => {
            onDone();
            void navigate({ to: "/budget" });
          }}
        >
          See Budget
        </PrimaryButton>
      </Sheet>
    );
  }

  return (
    <Sheet title="Log an expense" onClose={onDone}>
      <div className="space-y-3 pb-2">
        <Field label="What for?">
          <TextInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={140}
            placeholder="Groceries"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <TextInput
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Category">
            <SelectInput
              value={category}
              onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Paid by">
          <SelectInput
            value={paidBy || user?.id || ""}
            onChange={(e) => setPaidBy((e.target as HTMLSelectElement).value)}
          >
            {(members ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === user?.id ? "You" : (m.display_name ?? "Partner")}
              </option>
            ))}
          </SelectInput>
        </Field>
        <PrimaryButton
          disabled={!description.trim() || !amount || add.isPending}
          onClick={() => add.mutate()}
        >
          Add expense
        </PrimaryButton>
      </div>
    </Sheet>
  );
}
