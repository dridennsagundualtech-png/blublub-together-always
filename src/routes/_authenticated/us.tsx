import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  BookHeart,
  BookOpen,
  Droplets,
  HandHeart,
  HeartHandshake,
  HelpCircle,
  Images,
  ListChecks,
  MapPin,
  Palette,
  Plus,
  Sparkles,
  UserCog,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import {
  Field,
  LinkRow,
  Money,
  RowGroup,
  PrimaryButton,
  SelectInput,
  Sheet,
  TextArea,
  TextInput,
  Switch,
} from "@/components/ui-kit";
import { streakFromDates, todayISO, useBadges } from "@/lib/badges";
import { usePremiumAccess } from "@/lib/admin";
import { useSoundSetting } from "@/hooks/use-sound";
import { useAuthUser, useCoupleId, useMembers, usePartner, useProfile } from "@/lib/session";
import { useLocations, timeAgo } from "@/lib/location";
import { FEELING_BY_KEY, decodeFeeling } from "@/lib/feelings";

export const Route = createFileRoute("/_authenticated/us")({
  head: () => ({
    meta: [
      { title: "Us — BLUBLUB" },
      {
        name: "description",
        content: "Feelings, plans, money, memories and settings for the two of you.",
      },
      { property: "og:title", content: "Us — BLUBLUB" },
      {
        property: "og:description",
        content: "Feelings, plans, money, memories and settings for the two of you.",
      },
    ],
  }),
  component: UsPage,
});

type QuickKind = null | "choose" | "diary" | "todo" | "bucket" | "expense";

const MOODS = ["🩷", "😊", "🥹", "😴", "🔥", "😤", "🌧️", "✨"];
const CATEGORIES = ["Food", "Home", "Travel", "Gifts", "Health", "Fun", "Other"] as const;

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function phaseFor(start: string, cycleLength: number, periodLength: number) {
  const day =
    Math.floor(
      (Date.parse(`${todayISO()}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / 86_400_000,
    ) % cycleLength;
  if (day < periodLength) return "Period";
  if (day < cycleLength / 2 - 2) return "Follicular";
  if (day <= cycleLength / 2 + 1) return "Ovulation";
  return "Luteal";
}

function daysUntil(iso: string) {
  return Math.round(
    (Date.parse(`${iso}T00:00:00`) - Date.parse(`${todayISO()}T00:00:00`)) / 86_400_000,
  );
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function UsPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const partner = usePartner();
  const { data: locations } = useLocations();
  const { data: badges } = useBadges();
  const premium = usePremiumAccess();
  const sound = useSoundSetting();
  const [quick, setQuick] = useState<QuickKind>(null);
  const partnerName = partner?.display_name ?? "your partner";

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
    enabled: !!coupleId && premium,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount,paid_by")
        .eq("couple_id", coupleId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cooldowns } = useQuery({
    queryKey: ["cooldowns", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cooldowns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const { data: cycles } = useQuery({
    queryKey: ["cycle-logs", coupleId, user?.id],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycle_logs")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
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

  const latestCool = cooldowns?.find((c) => c.created_by === user?.id || c.shared);
  const coolMoods = decodeFeeling(latestCool?.feeling ?? "")
    .keys.map((k) => FEELING_BY_KEY.get(k)?.label)
    .filter(Boolean) as string[];
  const coolStatus = latestCool
    ? `${latestCool.created_by === user?.id ? "You" : (partner?.display_name ?? "Partner")}${
        coolMoods.length ? ` · ${coolMoods.slice(0, 2).join(", ")}` : " shared a note"
      } · ${timeAgo(latestCool.created_at)}`
    : "Pause, name the feeling, reconnect";

  const sharedCycle = (cycles ?? []).find((c) => c.user_id !== user?.id);
  const cycleSrc = sharedCycle ?? (cycles ?? []).find((c) => c.user_id === user?.id);
  const nextStart = cycleSrc ? addDays(cycleSrc.start_date, cycleSrc.cycle_length) : null;
  const cycleStatus =
    cycleSrc && nextStart
      ? `${phaseFor(cycleSrc.start_date, cycleSrc.cycle_length, cycleSrc.period_length)} · next in ${Math.max(0, daysUntil(nextStart))} days`
      : "Gentle, private tracking";

  const mine = locations?.find((l) => l.user_id === user?.id);
  const theirs = locations?.find((l) => l.user_id && l.user_id === partner?.id);
  const km = mine && theirs ? distanceKm(mine, theirs) : null;
  const distStatus =
    km === null
      ? !profile?.share_location
        ? "Location sharing is off"
        : `Waiting for ${partnerName}`
      : km < 0.1
        ? "You're together right now"
        : km < 1
          ? `${Math.round(km * 1000)} m apart`
          : `${km.toFixed(km < 10 ? 1 : 0)} km apart`;

  return (
    <AppLayout title="Us" subtitle="Everything we keep together" critter="seal" critterPose="love">
      <RowGroup title="Feelings & care">
        <LinkRow
          to="/cooldown"
          icon={<HeartHandshake className="size-5" />}
          tint="tile-sky"
          title="Cool-down"
          status={coolStatus}
        />
        <LinkRow
          to="/period"
          icon={<Droplets className="size-5" />}
          tint="tile-peach"
          title="Cycle"
          status={cycleStatus}
        />
        <LinkRow
          to="/commitments"
          icon={<HandHeart className="size-5" />}
          tint="tile-lilac"
          title="Promises"
          status="Little promises you keep together"
        />
        <LinkRow
          to="/map"
          icon={<MapPin className="size-5" />}
          tint="tile-cream"
          title="Where we are"
          status={distStatus}
        />
      </RowGroup>

      <RowGroup title="Plans & lists">
        <LinkRow
          to="/todos"
          icon={<ListChecks className="size-5" />}
          tint="tile-pink"
          title="To-dos & goals"
          status={openTodos === 0 ? "All done" : `${openTodos} left to do`}
        />
        <LinkRow
          to="/bucket"
          icon={<Sparkles className="size-5" />}
          tint="tile-peach"
          title="Bucket list"
          status={
            bucketTotal === 0 ? "Dream something up together" : `${bucketDone} of ${bucketTotal} done`
          }
        />
        <LinkRow
          to="/food"
          icon={<UtensilsCrossed className="size-5" />}
          tint="tile-cream"
          title="Food roulette"
          status="Can't decide what to eat? Spin for it"
        />
      </RowGroup>

      <RowGroup title="Money">
        <LinkRow
          to="/budget"
          icon={<Wallet className="size-5" />}
          tint="tile-sky"
          title="Budget"
          status={
            !premium ? (
              "Premium · shared expenses, goals and savings"
            ) : Math.abs(balance) < 0.01 ? (
              "All square"
            ) : balance > 0 ? (
              <>
                {partner?.display_name ?? "Your partner"} owes you <Money value={balance} />
              </>
            ) : (
              <>
                You owe {partnerName} <Money value={-balance} />
              </>
            )
          }
          dot={badges?.budget}
        />
      </RowGroup>

      <RowGroup title="Memories">
        <LinkRow
          to="/questions"
          icon={<HelpCircle className="size-5" />}
          tint="tile-lilac"
          title="Daily question"
          status="One a day, answered together"
          dot={badges?.question}
        />
        <LinkRow
          to="/diary"
          icon={<BookHeart className="size-5" />}
          tint="tile-pink"
          title="Diary"
          status={
            !lastEntry
              ? "Write something small today"
              : diaryStreak > 1
                ? `${diaryStreak}-day streak`
                : `Last: ${(lastEntry.title || lastEntry.body).slice(0, 40)}`
          }
        />
        <LinkRow
          to="/photos"
          icon={<Images className="size-5" />}
          tint="tile-sky"
          title="Photos"
          status="Your shared gallery"
        />
        <LinkRow
          to="/memory-book"
          icon={<BookOpen className="size-5" />}
          tint="tile-peach"
          title="Memory book"
          status="Turn your memories into a PDF keepsake"
        />
      </RowGroup>

      <RowGroup title="Settings">
        <LinkRow
          to="/appearance"
          icon={<Palette className="size-5" />}
          tint="tile-lilac"
          title="Appearance"
          status="Our colours"
        />
        <LinkRow
          to="/profile"
          icon={<UserCog className="size-5" />}
          tint="tile-cream"
          title="Profile & settings"
          status="You, your partner and your space"
        />
        <li className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-bold">Sound effects</span>
          <Switch checked={sound.enabled} onChange={(next) => sound.setEnabled(next)} label="Sound effects" />
        </li>
      </RowGroup>

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
            <ChoiceRow
              icon={<BookHeart className="size-5" />}
              title="Diary entry"
              onClick={() => setQuick("diary")}
            />
            <ChoiceRow
              icon={<ListChecks className="size-5" />}
              title="To-do"
              onClick={() => setQuick("todo")}
            />
            <ChoiceRow
              icon={<Sparkles className="size-5" />}
              title="Bucket list item"
              onClick={() => setQuick("bucket")}
            />
            {premium ? (
              <ChoiceRow
                icon={<Wallet className="size-5" />}
                title="Expense"
                onClick={() => setQuick("expense")}
              />
            ) : null}
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
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary-ink">
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
