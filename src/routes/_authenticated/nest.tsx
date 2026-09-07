import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BookHeart, ChevronRight, ListChecks, Plus, Sparkles, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  Field,
  Money,
  PrimaryButton,
  SectionTitle,
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
      {/* Right now summary */}
      <p className="mb-3 font-display text-lg font-bold text-foreground">Right now</p>
      <div className="grid gap-3">
        <SummaryTile
          tint="bg-[#FFC8DD]/40"
          icon={<BookHeart className="size-3.5 text-[#FFAFCC]" />}
          label="Diary"
          value={lastEntry ? (lastEntry.title || lastEntry.body).slice(0, 60) : "No entries yet"}
          detail={diaryStreak > 0 ? `${diaryStreak}-day streak` : "Write something small today"}
        />
        <div className="grid grid-cols-2 gap-3">
          <SummaryTile
            tint="bg-[#FFAFCC]/35"
            icon={<ListChecks className="size-3.5 text-[#FFAFCC]" />}
            label="To-Dos"
            value={openTodos === 0 ? "All done" : `${openTodos} left to do`}
          />
          <SummaryTile
            tint="bg-[#CDB4DB]/35"
            icon={<Sparkles className="size-3.5 text-[#CDB4DB]" />}
            label="Bucket List"
            value={`${bucketDone}/${bucketTotal} done`}
          />
        </div>
        <SummaryTile
          tint="bg-[#BDE0FE]/45"
          icon={<Wallet className="size-3.5 text-[#A2D2FF]" />}
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

      {/* Sleep-stories style nest tools panel */}
      <div className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-[#2A1F3D] to-[#1A1528] px-4 pb-5 pt-6 text-white">
        <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-[#CDB4DB]/30 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-8 size-24 rounded-full bg-[#FFAFCC]/20 blur-2xl" />
        <div className="pointer-events-none absolute right-10 top-20 size-16 rounded-full bg-[#A2D2FF]/15 blur-xl" />

        <div className="relative text-center">
          <p className="font-display text-2xl font-bold">Nest tools</p>
          <p className="mx-auto mt-1 max-w-[16rem] text-xs text-white/70">
            Diary, lists, dreams and money — kept in one cozy place
          </p>
        </div>

        {/* Featured — diary */}
        <Link
          to="/diary"
          className="press relative mt-5 block overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#CDB4DB] to-[#FFAFCC] p-5 text-[#3F2A3A]"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#3F2A3A]/70">Featured</p>
          <p className="mt-1 font-display text-xl font-bold">Shared Diary</p>
          <p className="mt-1 max-w-[14rem] text-xs text-[#3F2A3A]/80">
            {lastEntry
              ? `Latest: ${(lastEntry.title || lastEntry.body).slice(0, 42)}`
              : "Write a small note for each other"}
          </p>
          <span className="mt-4 inline-flex rounded-full bg-white/90 px-4 py-1.5 text-xs font-bold text-[#3F2A3A]">
            Open
          </span>
          <BookHeart className="absolute bottom-4 right-4 size-14 text-[#3F2A3A]/20" />
        </Link>

        {/* Mixed tiles */}
        <div className="relative mt-3 grid grid-cols-2 gap-3">
          <Link
            to="/todos"
            className="press flex min-h-[130px] flex-col justify-between rounded-[1.25rem] bg-[#FFC8DD] p-4 text-[#3F2A3A]"
          >
            <ListChecks className="size-7 opacity-80" />
            <div>
              <p className="font-display text-base font-bold">To-Dos</p>
              <p className="text-[11px] opacity-70">
                {openTodos === 0 ? "All clear" : `${openTodos} open`}
              </p>
            </div>
          </Link>
          <Link
            to="/bucket"
            className="press flex min-h-[130px] flex-col justify-between rounded-[1.25rem] bg-[#CDB4DB] p-4 text-[#3F2A3A]"
          >
            <Sparkles className="size-7 opacity-80" />
            <div>
              <p className="font-display text-base font-bold">Bucket List</p>
              <p className="text-[11px] opacity-70">
                {bucketDone}/{bucketTotal} done
              </p>
            </div>
          </Link>
          <Link
            to="/budget"
            className="press col-span-2 flex min-h-[100px] flex-col justify-between rounded-[1.25rem] bg-[#BDE0FE] p-4 text-[#3F2A3A]"
          >
            <Wallet className="size-6 opacity-80" />
            <div>
              <p className="font-display text-base font-bold">Budget</p>
              <p className="text-[11px] opacity-70">
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

function SummaryTile({
  icon,
  tint,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className={`rounded-[1.25rem] p-4 ${tint}`}>
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="mt-1.5 block text-sm font-bold leading-snug">{value}</span>
      {detail ? <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span> : null}
    </div>
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
        <PrimaryButton
          disabled={!body.trim() || add.isPending}
          onClick={() => add.mutate()}
        >
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
        <PrimaryButton
          disabled={!title.trim() || add.isPending}
          onClick={() => add.mutate()}
        >
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
        <PrimaryButton
          disabled={!title.trim() || add.isPending}
          onClick={() => add.mutate()}
        >
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
