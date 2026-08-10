import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PremiumGate } from "@/components/PremiumGate";
import {
  Card,
  StatCard,
  Field,
  Money,
  PrimaryButton,
  ProgressBar,
  SectionTitle,
  SelectInput,
  TextInput,
} from "@/components/ui-kit";
import { playChirp } from "@/hooks/use-sound";
import { todayISO } from "@/lib/badges";
import { useAuthUser, useCoupleId, useMembers, useProfile } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({
    meta: [
      { title: "Shared Budget — BLUBLUB" },
      { name: "description", content: "Track shared expenses, balances and savings goals." },
      { property: "og:title", content: "Shared Budget — BLUBLUB" },
      {
        property: "og:description",
        content: "Track shared expenses, balances and savings goals.",
      },
    ],
  }),
  component: BudgetPage,
});

const CATEGORIES = ["Food", "Home", "Travel", "Gifts", "Health", "Fun", "Other"] as const;
const CHART_COLORS = [
  "oklch(0.72 0.13 12)",
  "oklch(0.8 0.1 40)",
  "oklch(0.78 0.09 200)",
  "oklch(0.75 0.11 300)",
  "oklch(0.82 0.12 90)",
  "oklch(0.7 0.1 150)",
  "oklch(0.68 0.05 300)",
];

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function BudgetPage() {
  const { data: profile } = useProfile();

  return (
    <AppLayout title="Budget" subtitle="Money, together" critter="cat">
      <PremiumGate unlocked={!!profile?.is_premium} title="Budget Tracker is Premium">
        <BudgetContent />
      </PremiumGate>
    </AppLayout>
  );
}

function BudgetContent() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: members } = useMembers();
  const qc = useQueryClient();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState<string>("");
  const [spentOn, setSpentOn] = useState(todayISO());

  const payer = paidBy || user?.id || "";

  const { data: expenses } = useQuery({
    queryKey: ["expenses", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("spent_on", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: budgetGoals } = useQuery({
    queryKey: ["budget-goals", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_goals")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("category");
      if (error) throw error;
      return data;
    },
  });

  const { data: savings } = useQuery({
    queryKey: ["savings", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const [{ data: goals }, { data: contribs }] = await Promise.all([
        supabase.from("savings_goals").select("*").eq("couple_id", coupleId!).order("created_at"),
        supabase.from("savings_contributions").select("*").eq("couple_id", coupleId!),
      ]);
      return (goals ?? []).map((g) => ({
        ...g,
        saved: (contribs ?? [])
          .filter((c) => c.goal_id === g.id)
          .reduce((s, c) => s + Number(c.amount), 0),
      }));
    },
  });

  const { data: bills } = useQuery({
    queryKey: ["bills", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("due_day");
      if (error) throw error;
      return data;
    },
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("expenses").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        paid_by: payer,
        description: description.trim(),
        category,
        amount: value,
        spent_on: spentOn,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDescription("");
      setAmount("");
      void qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const rows = expenses ?? [];
  const thisMonth = monthKey(todayISO());
  const prevMonth = (() => {
    const d = new Date(`${todayISO()}T00:00:00`);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  // Balance: each expense is split 50/50, so the payer is owed half by the other.
  const balance = useMemo(() => {
    if (!user) return 0;
    return rows.reduce((sum, e) => {
      const half = Number(e.amount) / 2;
      return e.paid_by === user.id ? sum + half : sum - half;
    }, 0);
  }, [rows, user]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    rows
      .filter((e) => monthKey(e.spent_on) === thisMonth)
      .forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount)));
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [rows, thisMonth]);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((e) => map.set(monthKey(e.spent_on), (map.get(monthKey(e.spent_on)) ?? 0) + Number(e.amount)));
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([name, total]) => ({ name, total }));
  }, [rows]);

  const monthTotal = byCategory.reduce((s, c) => s + c.value, 0);
  const prevTotal = rows
    .filter((e) => monthKey(e.spent_on) === prevMonth)
    .reduce((s, e) => s + Number(e.amount), 0);
  const delta = prevTotal > 0 ? ((monthTotal - prevTotal) / prevTotal) * 100 : null;
  const biggest =
    byCategory.length > 0 && monthTotal > 0
      ? byCategory.reduce((a, b) => (b.value > a.value ? b : a))
      : null;

  const nameOf = (id: string) => members?.find((m) => m.id === id)?.display_name ?? "Partner";

  return (
    <>
      <Card className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Running balance
        </p>
        <p className="mt-1 text-3xl font-extrabold text-primary">
          <Money value={Math.abs(balance)} />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {Math.abs(balance) < 0.01
            ? "All square 🩷"
            : balance > 0
              ? "owed to you"
              : "you owe your partner"}
        </p>
      </Card>

      <SectionTitle>Log an expense</SectionTitle>
      <Card>
        <div className="space-y-3">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Paid by">
              <SelectInput
                value={payer}
                onChange={(e) => setPaidBy((e.target as HTMLSelectElement).value)}
              >
                {(members ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === user?.id ? "You" : (m.display_name ?? "Partner")}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Date">
              <TextInput type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
            </Field>
          </div>
          <PrimaryButton
            disabled={!description.trim() || !amount || addExpense.isPending}
            onClick={() => addExpense.mutate()}
          >
            Add expense
          </PrimaryButton>
        </div>
      </Card>

      <SectionTitle>This month</SectionTitle>
      <StatCard>
        <p className="text-sm font-bold">
          <Money value={monthTotal} /> spent
        </p>
        <p className={`text-xs ${delta !== null && delta > 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {delta === null
            ? "No data for last month yet."
            : `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs last month (${prevTotal.toFixed(0)} then)`}
        </p>
        {biggest ? (
          <p className="mt-2 rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">
            Biggest category: {biggest.name} — <Money value={biggest.value} /> (
            {Math.round((biggest.value / monthTotal) * 100)}% of the month)
          </p>
        ) : null}
        {byCategory.length > 0 ? (
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={70} label>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </StatCard>

      {byMonth.length > 1 ? (
        <Card className="mt-3">
          <p className="text-sm font-bold">Month over month</p>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip />
                <Bar dataKey="total" fill={CHART_COLORS[0]} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      <SectionTitle>Category budgets</SectionTitle>
      <BudgetGoals
        coupleId={coupleId}
        goals={budgetGoals ?? []}
        spentByCategory={Object.fromEntries(byCategory.map((c) => [c.name, c.value]))}
      />

      <SectionTitle>Savings goals</SectionTitle>
      <SavingsGoals coupleId={coupleId} userId={user?.id ?? null} goals={savings ?? []} />

      <SectionTitle>Recurring bills</SectionTitle>
      <Bills coupleId={coupleId} bills={bills ?? []} />

      <SectionTitle>Recent expenses</SectionTitle>
      {rows.length === 0 ? (
        <Card className="text-sm text-muted-foreground">Nothing logged yet.</Card>
      ) : (
        <ul className="space-y-2 pb-4">
          {rows.slice(0, 40).map((e) => (
            <li key={e.id} className="card-soft flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{e.description}</p>
                <p className="text-xs text-muted-foreground">
                  {e.category} · {e.spent_on} · paid by{" "}
                  {e.paid_by === user?.id ? "you" : nameOf(e.paid_by)}
                </p>
              </div>
              <span className="text-sm font-bold">
                <Money value={Number(e.amount)} />
              </span>
              <button
                aria-label="Delete expense"
                onClick={() => removeExpense.mutate(e.id)}
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

function BudgetGoals({
  coupleId,
  goals,
  spentByCategory,
}: {
  coupleId: string | null;
  goals: { id: string; category: string; monthly_limit: number }[];
  spentByCategory: Record<string, number>;
}) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [limit, setLimit] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const value = Number(limit);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a valid limit");
      const existing = goals.find((g) => g.category === category);
      const { error } = existing
        ? await supabase.from("budget_goals").update({ monthly_limit: value }).eq("id", existing.id)
        : await supabase
            .from("budget_goals")
            .insert({ couple_id: coupleId!, category, monthly_limit: value });
      if (error) throw error;
    },
    onSuccess: () => {
      setLimit("");
      void qc.invalidateQueries({ queryKey: ["budget-goals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Card>
        <div className="flex gap-2">
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
          <TextInput
            type="number"
            min={0}
            step="1"
            placeholder="Monthly limit"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
          <PrimaryButton className="w-auto px-5" disabled={!limit} onClick={() => save.mutate()}>
            Set
          </PrimaryButton>
        </div>
      </Card>
      <ul className="mt-3 space-y-2">
        {goals.map((g) => {
          const spent = spentByCategory[g.category] ?? 0;
          const pct = (spent / Number(g.monthly_limit)) * 100;
          const left = Number(g.monthly_limit) - spent;
          return (
            <li key={g.id} className="card-soft p-4">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>{g.category}</span>
                <span>
                  <Money value={spent} /> / <Money value={Number(g.monthly_limit)} />
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar value={pct} />
              </div>
              <p
                className={`mt-2 text-xs font-semibold ${
                  pct >= 100 ? "text-destructive" : pct >= 80 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {pct >= 100 ? (
                  <>
                    Over by <Money value={Math.abs(left)} /> — ease off this one
                  </>
                ) : pct >= 80 ? (
                  <>
                    Careful — only <Money value={left} /> left
                  </>
                ) : (
                  <>
                    <Money value={left} /> left this month
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function SavingsGoals({
  coupleId,
  userId,
  goals,
}: {
  coupleId: string | null;
  userId: string | null;
  goals: { id: string; title: string; target_amount: number; saved: number }[];
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [contrib, setContrib] = useState<Record<string, string>>({});

  const addGoal = useMutation({
    mutationFn: async () => {
      const value = Number(target);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a valid target");
      const { error } = await supabase
        .from("savings_goals")
        .insert({ couple_id: coupleId!, title: title.trim(), target_amount: value });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setTarget("");
      void qc.invalidateQueries({ queryKey: ["savings"] });
      void qc.invalidateQueries({ queryKey: ["home-savings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addContribution = useMutation({
    mutationFn: async (goalId: string) => {
      const value = Number(contrib[goalId]);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("savings_contributions").insert({
        couple_id: coupleId!,
        goal_id: goalId,
        created_by: userId!,
        amount: value,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContrib({});
      void qc.invalidateQueries({ queryKey: ["savings"] });
      void qc.invalidateQueries({ queryKey: ["home-savings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Card>
        <div className="flex gap-2">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Trip to Kyoto"
            maxLength={100}
          />
          <TextInput
            type="number"
            min={0}
            placeholder="Target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <PrimaryButton
            className="w-auto px-5"
            disabled={!title.trim() || !target}
            onClick={() => addGoal.mutate()}
          >
            Add
          </PrimaryButton>
        </div>
      </Card>
      <ul className="mt-3 space-y-3">
        {goals.map((g) => (
          <li key={g.id} className="card-soft p-4">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>{g.title}</span>
              <span>
                <Money value={g.saved} /> / <Money value={Number(g.target_amount)} />
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar value={(g.saved / Number(g.target_amount)) * 100} />
            </div>
            <div className="mt-3 flex gap-2">
              <TextInput
                type="number"
                min={0}
                placeholder="Add to fund"
                value={contrib[g.id] ?? ""}
                onChange={(e) => setContrib((c) => ({ ...c, [g.id]: e.target.value }))}
              />
              <PrimaryButton
                className="w-auto px-5"
                disabled={!contrib[g.id]}
                onClick={() => addContribution.mutate(g.id)}
              >
                Save
              </PrimaryButton>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

type BillRow = {
  id: string;
  title: string;
  amount: number;
  due_day: number;
  category: string | null;
  next_due_on: string | null;
  last_paid_on: string | null;
};

/** Next occurrence of `dueDay` strictly after the given date. */
function rollForward(dueDay: number, from: Date) {
  const day = Math.min(28, Math.max(1, dueDay));
  const next = new Date(from.getFullYear(), from.getMonth(), day);
  if (next <= from) next.setMonth(next.getMonth() + 1);
  return next.toISOString().slice(0, 10);
}

function Bills({ coupleId, bills }: { coupleId: string | null; bills: BillRow[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");

  const add = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a valid amount");
      const day = Math.min(28, Math.max(1, Number(dueDay)));
      const { error } = await supabase.from("bills").insert({
        couple_id: coupleId!,
        title: title.trim(),
        amount: value,
        due_day: day,
        next_due_on: rollForward(day, new Date(Date.now() - 86_400_000)),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setAmount("");
      void qc.invalidateQueries({ queryKey: ["bills"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (bill: BillRow) => {
      const { error } = await supabase
        .from("bills")
        .update({
          last_paid_on: todayISO(),
          next_due_on: rollForward(bill.due_day, new Date()),
        })
        .eq("id", bill.id);
      if (error) throw error;
    },
    onSuccess: () => {
      playChirp("success");
      toast.success("Paid — rolled over to next month");
      void qc.invalidateQueries({ queryKey: ["bills"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["bills"] }),
  });


  return (
    <>
      <Card>
        <div className="flex gap-2">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Rent"
            maxLength={100}
          />
          <TextInput
            type="number"
            min={0}
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <TextInput
            type="number"
            min={1}
            max={28}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            className="w-20"
          />
          <PrimaryButton
            className="w-auto px-4"
            disabled={!title.trim() || !amount}
            onClick={() => add.mutate()}
          >
            Add
          </PrimaryButton>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Last field is the day of the month.</p>
      </Card>
      <ul className="mt-3 space-y-2">
        {bills.map((b) => {
          const due = b.next_due_on ?? rollForward(b.due_day, new Date(Date.now() - 86_400_000));
          const daysLeft = Math.round(
            (new Date(`${due}T00:00:00`).getTime() - new Date(`${todayISO()}T00:00:00`).getTime()) /
              86_400_000,
          );
          const soon = daysLeft <= 2;
          return (
            <li key={b.id} className="card-soft flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{b.title}</p>
                <p className={`text-xs ${soon ? "font-bold text-destructive" : "text-muted-foreground"}`}>
                  Due {due}
                  {daysLeft < 0
                    ? " · overdue"
                    : daysLeft === 0
                      ? " · today"
                      : soon
                        ? ` · in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
                        : ""}
                </p>
                {b.last_paid_on ? (
                  <p className="text-[10px] text-muted-foreground">Last paid {b.last_paid_on}</p>
                ) : null}
              </div>
              <span className="text-sm font-bold">
                <Money value={Number(b.amount)} />
              </span>
              <button
                type="button"
                onClick={() => markPaid.mutate(b)}
                className="press rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground"
              >
                Paid
              </button>
              <button
                aria-label="Delete bill"
                onClick={() => remove.mutate(b.id)}
                className="press rounded-full p-1 text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
