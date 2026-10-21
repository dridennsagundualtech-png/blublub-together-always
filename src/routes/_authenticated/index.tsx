import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ChevronRight, Heart, Images, MapPin, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Doodle } from "@/components/Doodles";
import type { FeelingRow } from "@/components/FeelingTile";
import { ProgressBar, ProgressRing } from "@/components/ui-kit";
import { FEELING_BY_KEY, decodeFeeling } from "@/lib/feelings";
import { timeAgo } from "@/lib/location";
import { NotificationBell } from "@/components/NotificationBell";
import { useBadges, todayISO } from "@/lib/badges";
import { daysUntilAnniversary, useAnniversaryReminder } from "@/lib/reminders";
import {
  daysTogether,
  useAuthUser,
  useCoupleId,
  useMembers,
  usePartner,
  useProfile,
} from "@/lib/session";
import { useDerivedDates } from "@/lib/calendar-sources";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Today — BLUBLUB" },
      {
        name: "description",
        content: "Your private couples space for today: question, mood, memories.",
      },
      { property: "og:title", content: "Today — BLUBLUB" },
      {
        property: "og:description",
        content: "A cozy private app for two: calendar, memories, diary, budget and chat.",
      },
    ],
  }),
  component: HomePage,
});

function greetingForHour() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function HomePage() {
  const coupleId = useCoupleId();
  const { data: profile } = useProfile();
  const { data: members } = useMembers();
  const partner = usePartner();
  const { data: badges } = useBadges();
  const { data: user } = useAuthUser();
  const today = todayISO();

  const { data: feelings } = useQuery({
    queryKey: ["home-feelings", coupleId],
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

  const theirFeel = feelings?.find((c) => c.created_by !== user?.id && c.shared);

  const anniversary =
    members?.map((m) => m.anniversary_date).filter(Boolean).sort()[0] ??
    profile?.anniversary_date ??
    null;
  const days = daysTogether(anniversary);
  const untilAnniversary = daysUntilAnniversary(anniversary);
  useAnniversaryReminder();

  const { data: todayAnswers } = useQuery({
    queryKey: ["home-answers", coupleId, today],
    enabled: !!coupleId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_answers")
        .select("created_by")
        .eq("couple_id", coupleId!)
        .eq("answer_date", today);
      if (error) throw error;
      return data ?? [];
    },
  });

  const iAnswered = (todayAnswers ?? []).some((r) => r.created_by === user?.id);
  const partnerAnswered = (todayAnswers ?? []).some((r) => r.created_by !== user?.id);
  const bothAnswered = iAnswered && partnerAnswered;

  let questionCta = "Start";
  let questionHint = "Answer together today";
  if (bothAnswered) {
    questionCta = "Open";
    questionHint = "You both answered";
  } else if (iAnswered) {
    questionCta = "Waiting";
    questionHint = `Waiting for ${partner?.display_name ?? "partner"}`;
  } else if (partnerAnswered) {
    questionCta = "Reveal";
    questionHint = "They answered — your turn";
  }

  const { data: latestPhoto } = useQuery({
    queryKey: ["home-latest-photo", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("couple_id", coupleId!)
        .not("storage_path", "is", null)
        .order("taken_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data?.storage_path) return null;
      const signed = await supabase.storage
        .from("photos")
        .createSignedUrl(data.storage_path, 3600);
      return { ...data, url: signed.data?.signedUrl ?? null };
    },
  });

  const { data: upcoming } = useQuery({
    queryKey: ["upcoming-events", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("couple_id", coupleId!)
        .gte("event_date", today)
        .order("event_date")
        .limit(2);
      if (error) throw error;
      return data;
    },
  });

  const { data: derived } = useDerivedDates();
  const nextSpecial = [
    ...(upcoming ?? []).map((e) => ({ title: e.title, date: e.event_date })),
    ...(derived ?? [])
      .filter((d) => d.kind !== "cycle" && d.date >= today)
      .map((d) => ({ title: d.title, date: d.date })),
  ].sort((a, b) => a.date.localeCompare(b.date))[0];

  const { data: lists } = useQuery({
    queryKey: ["home-lists", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const [todos, bucket] = await Promise.all([
        supabase.from("todos").select("done").eq("couple_id", coupleId!),
        supabase.from("bucket_list").select("done").eq("couple_id", coupleId!),
      ]);
      if (todos.error) throw todos.error;
      if (bucket.error) throw bucket.error;
      return { todos: todos.data ?? [], bucket: bucket.data ?? [] };
    },
  });

  const name = profile?.display_name;
  const partnerName = partner?.display_name ?? "your partner";
  const answeredCount = (iAnswered ? 1 : 0) + (partnerAnswered ? 1 : 0);
  const todoDone = (lists?.todos ?? []).filter((t) => t.done).length;
  const todoTotal = lists?.todos.length ?? 0;
  const bucketDone = (lists?.bucket ?? []).filter((b) => b.done).length;
  const bucketTotal = lists?.bucket.length ?? 0;
  const anniversaryPct =
    untilAnniversary === null ? 0 : Math.round(((365 - untilAnniversary) / 365) * 100);

  return (
    <AppLayout title="BLUBLUB" subtitle={partner ? `With ${partner.display_name}` : "Your space"}>
      {/* Greeting */}
      <div className="flex items-center justify-between gap-3 pb-5 pt-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{greetingForHour()}</p>
          <p className="truncate font-display text-[1.65rem] font-bold leading-tight tracking-tight text-foreground">
            {name ?? "Hello!"}
          </p>
        </div>
        <NotificationBell className="shrink-0" />
      </div>

      {/* Hero: the one thing to do today */}
      <Link
        to="/questions"
        className="press relative flex items-center gap-4 overflow-hidden rounded-[1.5rem] bg-primary p-5 text-primary-foreground shadow-float"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-snug">Today&apos;s question</p>
          <p className="mt-1 text-sm opacity-90">{questionHint}</p>
          <span className="mt-4 inline-flex rounded-full bg-card px-4 py-2 text-xs font-bold text-card-foreground">
            {questionCta}
          </span>
        </div>
        <ProgressRing
          value={(answeredCount / 2) * 100}
          size={76}
          stroke={7}
          label={`${answeredCount}/2`}
          trackClassName="stroke-card/40"
          barClassName="stroke-card"
        />
        {badges?.question ? (
          <span className="absolute right-3 top-3 size-2 rounded-full bg-card" />
        ) : null}
      </Link>

      {/* Together — its own card */}
      {days !== null || untilAnniversary !== null ? (
        <Link
          to="/calendar"
          className="card-soft press mt-4 grid grid-cols-2 divide-x divide-border/60"
          data-theme-box="home-together"
        >
          <span className="px-4 py-3">
            <span className="block text-xs font-semibold text-muted-foreground">Together</span>
            <span className="block font-display text-xl font-bold text-foreground">
              {days !== null ? `Day ${days}` : "—"}
            </span>
          </span>
          <span className="flex items-center justify-between gap-2 px-4 py-3">
            <span>
              <span className="block text-xs font-semibold text-muted-foreground">Anniversary</span>
              <span className="block font-display text-xl font-bold text-foreground">
                {untilAnniversary === null
                  ? "—"
                  : untilAnniversary === 0
                    ? "Today!"
                    : `${untilAnniversary} days`}
              </span>
            </span>
            {untilAnniversary !== null ? (
              <ProgressRing value={anniversaryPct} size={40} stroke={5} label="" />
            ) : null}
          </span>
        </Link>
      ) : null}

      {/* How they feel — big, same size as the Memories preview */}
      <div className="mb-3 mt-7 flex items-end justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">How {partnerName} feels</h2>
        <Link to="/cooldown" className="text-xs font-semibold text-primary">
          Share yours
        </Link>
      </div>
      <Link
        to="/cooldown"
        className="card-soft press relative block overflow-hidden"
        data-theme-box="home-feeling"
      >
        <FeelingArt row={theirFeel ?? null} />
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-3 pt-8">
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-foreground">
              {feelingLabel(theirFeel ?? null)}
            </span>
            <span className="block text-xs text-muted-foreground">
              {theirFeel
                ? timeAgo(theirFeel.created_at)
                : `When ${partnerName} shares, it shows here`}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </span>
      </Link>

      {/* In progress */}
      <h2 className="mb-3 mt-7 font-display text-lg font-bold text-foreground">In progress</h2>
      <div className="grid grid-cols-2 gap-3">
        <ProgressCard
          to="/todos"
          tint="tile-sky"
          label="To-dos"
          title={todoTotal === 0 ? "Nothing yet" : `${todoDone} of ${todoTotal} done`}
          detail={
            todoTotal - todoDone === 1 ? "1 left to do" : `${todoTotal - todoDone} left to do`
          }
          value={todoTotal ? (todoDone / todoTotal) * 100 : 0}
        />
        <ProgressCard
          to="/bucket"
          tint="tile-peach"
          label="Bucket list"
          title={bucketTotal === 0 ? "Dream something up" : `${bucketDone} of ${bucketTotal} done`}
          detail="Someday, together"
          value={bucketTotal ? (bucketDone / bucketTotal) * 100 : 0}
        />
      </div>

      {/* Memories — the latest photo, big */}
      <div className="mb-3 mt-7 flex items-end justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">Memories</h2>
        <Link
          to="/photos"
          search={{ view: "feed" }}
          className="press inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground shadow-soft"
        >
          <Images className="size-4" />
          Feed
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <Link
        to="/photos"
        search={{ view: "feed" }}
        className="card-soft press relative block overflow-hidden"
        data-theme-box="home-memory"
      >
        {latestPhoto?.url ? (
          <>
            <img
              src={latestPhoto.url}
              alt={latestPhoto.caption || "Your latest memory"}
              className="aspect-[4/3] w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-10 text-white">
              <span className="block truncate text-sm font-bold">
                {latestPhoto.caption || "Your latest memory"}
              </span>
              <span className="block text-xs opacity-90">
                {new Date(`${latestPhoto.taken_on}T00:00:00`).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </span>
          </>
        ) : (
          <span className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 tile-peach">
            <Images className="size-8 text-primary" />
            <span className="text-sm font-bold text-foreground">Add your first memory</span>
          </span>
        )}
      </Link>

      {/* For you both */}
      <h2 className="mb-3 mt-7 font-display text-lg font-bold text-foreground">For you both</h2>
      <ul className="space-y-3">
        <HomeRow
          to="/food"
          tint="tile-peach"
          icon={<UtensilsCrossed className="size-5" />}
          title="Food roulette"
          detail="Can't decide what to eat? Spin for it"
        />
        <HomeRow
          to="/map"
          tint="tile-sky"
          icon={<MapPin className="size-5" />}
          title="Where we are"
          detail="Shared location"
        />
      </ul>

      {!partner ? (
        <Link
          to="/profile"
          className="press mt-6 flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground"
        >
          <Heart className="size-4" />
          Pair with partner
        </Link>
      ) : null}
    </AppLayout>
  );
}

/** Small tinted card with a bar, like the reference's "In Progress" row. */
function ProgressCard({
  to,
  tint,
  label,
  title,
  detail,
  value,
}: {
  to: string;
  tint: string;
  label: string;
  title: string;
  detail: string;
  value: number;
}) {
  return (
    <Link to={to} className={`press flex min-w-0 flex-col gap-1 p-4 ${tint}`}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="font-display text-base font-bold leading-snug text-foreground">{title}</span>
      <span className="truncate text-xs text-muted-foreground">{detail}</span>
      <span className="mt-2">
        <ProgressBar value={value} />
      </span>
    </Link>
  );
}

/** White row with a tinted icon tile, like the reference's "Task Groups" list. */
function HomeRow({
  to,
  tint,
  icon,
  title,
  detail,
}: {
  to: string;
  tint: string;
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <li>
      <Link to={to} className="card-soft press flex items-center gap-3 p-3 pr-4">
        <span
          className={`grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl text-primary ${tint}`}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{detail}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** The partner's pixel feeling picture(s), large, on a soft tile — 4:3 like the Memories card. */
function FeelingArt({ row }: { row: FeelingRow }) {
  const picks = decodeFeeling(row?.feeling ?? "")
    .keys.map((k) => FEELING_BY_KEY.get(k))
    .filter(Boolean)
    .slice(0, 2);
  return (
    <span className="flex aspect-[4/3] w-full items-center justify-center gap-2 px-6 pb-14 pt-4 tile-lilac">
      {picks.length ? (
        picks.map((f) => (
          <img
            key={f!.key}
            src={f!.url}
            alt={f!.label}
            className={`${picks.length > 1 ? "w-[42%]" : "w-[58%]"} max-h-full object-contain`}
            style={{ imageRendering: "pixelated" }}
          />
        ))
      ) : (
        <Doodle critter="seal" pose="sleep" size={128} />
      )}
    </span>
  );
}

function feelingLabel(row: FeelingRow) {
  if (!row) return "Nothing shared yet";
  const decoded = decodeFeeling(row.feeling ?? "");
  const labels = decoded.keys.map((k) => FEELING_BY_KEY.get(k)?.label).filter(Boolean);
  return labels.length
    ? labels.slice(0, 2).join(", ")
    : decoded.text.slice(0, 40) || "Shared a note";
}
