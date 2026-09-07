import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Heart,
  HelpCircle,
  Images,
  ListTodo,
  MessageCircle,
  Moon,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Doodle } from "@/components/Doodles";
import { Card, ProgressBar, SectionTitle } from "@/components/ui-kit";
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
import { FeelingTile } from "@/components/FeelingTile";
import { useDerivedDates } from "@/lib/calendar-sources";
import { cn } from "@/lib/utils";

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

  // Today's question status (Paired-style)
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

  let questionStatus: "answer" | "waiting" | "reveal" | "done" = "answer";
  if (bothAnswered) questionStatus = "done";
  else if (iAnswered && !partnerAnswered) questionStatus = "waiting";
  else if (!iAnswered && partnerAnswered) questionStatus = "reveal";
  else questionStatus = "answer";

  const questionCopy = {
    answer: {
      title: "Today's question",
      subtitle: "Answer privately — reveal when you both reply",
      cta: "Answer now",
    },
    waiting: {
      title: "You answered",
      subtitle: `Waiting for ${partner?.display_name ?? "your partner"}…`,
      cta: "View question",
    },
    reveal: {
      title: "Partner answered",
      subtitle: "Your answer unlocks the reveal",
      cta: "Answer & reveal",
    },
    done: {
      title: "Both answered today",
      subtitle: "See what you each wrote",
      cta: "Open answers",
    },
  }[questionStatus];

  // Latest shared photo memory
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
      return {
        ...data,
        url: signed.data?.signedUrl ?? null,
      };
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
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: derived } = useDerivedDates();

  const KIND_ICON: Record<string, LucideIcon> = {
    event: CalendarDays,
    anniversary: Heart,
    date: Moon,
    bill: CircleDollarSign,
    bucket: Target,
    cycle: Sparkles,
  };

  const comingUp = [
    ...(upcoming ?? []).map((e) => ({
      id: e.id,
      date: e.event_date,
      title: e.title,
      kind: "event" as const,
    })),
    ...(derived ?? [])
      .filter((d) => d.kind !== "cycle" && d.date >= today)
      .map((d) => ({
        id: d.id,
        date: d.date,
        title: d.title,
        kind: d.kind,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <AppLayout title="Today" subtitle="Let's grow together" critter="cat">
      {/* 1. Relationship hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-primary/12 via-lavender-soft/40 to-transparent px-5 pb-5 pt-6 text-center">
        <Doodle
          critter="penguin"
          pose="wave"
          size={36}
          className="absolute -left-1 bottom-2 opacity-25"
        />
        <Doodle
          critter="seal"
          pose="love"
          size={32}
          className="absolute right-0 top-2 opacity-25"
        />

        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {partner
            ? `You & ${partner.display_name}`
            : profile?.display_name
              ? `Hi ${profile.display_name}`
              : "Your space"}
        </p>
        <p className="mt-1 font-display text-4xl font-extrabold text-primary">
          {days !== null ? `Day ${days}` : "—"}
        </p>
        {days !== null ? (
          <div className="mx-auto mt-3 max-w-[12rem]">
            <ProgressBar value={((days % 100) / 100) * 100} tone="pink" />
            <p className="mt-1 text-[10px] font-bold text-muted-foreground">
              {100 - (days % 100)} to day {Math.floor(days / 100) * 100 + 100}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Add your anniversary in Profile to start counting
          </p>
        )}

        {untilAnniversary !== null && untilAnniversary <= 30 ? (
          <p className="mt-3 text-xs font-bold text-primary">
            {untilAnniversary === 0
              ? "Anniversary is today"
              : `${untilAnniversary} days until your anniversary`}
          </p>
        ) : null}

        {!partner ? (
          <Link
            to="/profile"
            className="press mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-float"
          >
            Pair with partner
          </Link>
        ) : null}
      </section>

      {/* 2. Today's focus — daily question (Paired-style hero action) */}
      <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Today&apos;s focus
      </p>
      <Link
        to="/questions"
        className={cn(
          "card-raised press relative flex items-center gap-3 overflow-hidden p-4",
          questionStatus === "done" && "ring-1 ring-primary/30",
          questionStatus === "reveal" && "ring-1 ring-destructive/40",
        )}
      >
        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-2xl",
            questionStatus === "done"
              ? "bg-primary/15 text-primary"
              : questionStatus === "reveal"
                ? "bg-destructive/10 text-destructive"
                : "tile-lilac text-primary",
          )}
        >
          {questionStatus === "done" ? (
            <Sparkles className="size-6" />
          ) : (
            <HelpCircle className="size-6" />
          )}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-extrabold">{questionCopy.title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {questionCopy.subtitle}
          </span>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary">
            {questionCopy.cta}
            <ChevronRight className="size-3.5" />
          </span>
        </span>
        {badges?.question ? (
          <span className="absolute right-3 top-3 size-2.5 rounded-full bg-destructive" />
        ) : null}
      </Link>

      {/* 3. Partner mood */}
      <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        How they feel
      </p>
      <FeelingTile
        who={partner?.display_name ?? "Partner"}
        row={theirFeel ?? null}
        linkTo="/cooldown"
      />

      {/* 4. Latest memory (Locket / Between style presence) */}
      <div className="mb-2 mt-5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          A recent memory
        </p>
        <Link to="/photos" className="text-xs font-bold text-primary">
          All memories
        </Link>
      </div>
      {latestPhoto?.url ? (
        <Link to="/photos" className="press block overflow-hidden rounded-3xl p-0">
          <img
            src={latestPhoto.url}
            alt={latestPhoto.caption ?? "Memory"}
            className="aspect-[4/5] w-full object-cover"
            loading="lazy"
          />
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {latestPhoto.caption || latestPhoto.album || "Shared memory"}
              </p>
              <p className="text-xs text-muted-foreground">{latestPhoto.taken_on}</p>
            </div>
            <Images className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </Link>
      ) : (
        <Link
          to="/photos"
          className="surface-quiet press flex flex-col items-center gap-2 px-4 py-10 text-center"
        >
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Images className="size-6" />
          </span>
          <p className="text-sm font-bold">No photos yet</p>
          <p className="text-xs text-muted-foreground">
            Add a memory so it shows up here for both of you
          </p>
        </Link>
      )}

      {/* 5. Coming up — compact */}
      <SectionTitle
        action={
          <Link to="/calendar" className="text-xs font-bold text-primary">
            Calendar
          </Link>
        }
      >
        Coming up
      </SectionTitle>
      {comingUp.length > 0 ? (
        <ul className="space-y-2">
          {comingUp.map((e) => {
            const Icon = KIND_ICON[e.kind] ?? CalendarDays;
            return (
              <li key={e.id} className="list-row">
                <span className="tile-peach grid size-10 shrink-0 place-items-center rounded-2xl text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.date}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="text-sm text-muted-foreground">
          Nothing planned — add a date on the calendar.
        </Card>
      )}

      {/* 6. Quick links — secondary, not competing with Today */}
      <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Jump to
      </p>
      <div className="grid grid-cols-3 gap-2 pb-2">
        <Link
          to="/chat"
          className="surface-quiet press flex flex-col items-center gap-1.5 p-3 text-center"
        >
          <MessageCircle className="size-5 text-primary" />
          <span className="text-[11px] font-bold">Chat</span>
          {badges?.unreadChat ? (
            <span className="size-1.5 rounded-full bg-destructive" />
          ) : null}
        </Link>
        <Link
          to="/photos"
          className="surface-quiet press flex flex-col items-center gap-1.5 p-3 text-center"
        >
          <Images className="size-5 text-primary" />
          <span className="text-[11px] font-bold">Memories</span>
        </Link>
        <Link
          to="/calendar"
          className="surface-quiet press flex flex-col items-center gap-1.5 p-3 text-center"
        >
          <CalendarDays className="size-5 text-primary" />
          <span className="text-[11px] font-bold">Calendar</span>
        </Link>
      </div>
    </AppLayout>
  );
}
