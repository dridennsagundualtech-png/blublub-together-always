import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, HelpCircle, Images, PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Doodle } from "@/components/Doodles";
import { Card, Money, ProgressBar, SectionTitle, StatCard } from "@/components/ui-kit";
import { useBadges, todayISO } from "@/lib/badges";
import { daysUntilAnniversary, useAnniversaryReminder } from "@/lib/reminders";
import { daysTogether, useAuthUser, useCoupleId, useMembers, usePartner, useProfile } from "@/lib/session";
import { FeelingTile } from "@/components/FeelingTile";
import { DERIVED_META, useDerivedDates } from "@/lib/calendar-sources";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "BLUBLUB — Your private couples space" },
      {
        name: "description",
        content:
          "BLUBLUB is a cozy private app for two: shared calendar, photo timeline, diary, budget and chat.",
      },
      { property: "og:title", content: "BLUBLUB — Your private couples space" },
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


  const { data: upcoming } = useQuery({
    queryKey: ["upcoming-events", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("couple_id", coupleId!)
        .gte("event_date", todayISO())
        .order("event_date")
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: derived } = useDerivedDates();

  // Everything with a date — calendar events plus planned date nights, bills,
  // bucket-list targets — merged into one "coming up" list.
  const comingUp = [
    ...(upcoming ?? []).map((e) => ({ id: e.id, date: e.event_date, title: e.title, emoji: "📅" })),
    ...(derived ?? [])
      .filter((d) => d.kind !== "cycle" && d.date >= todayISO())
      .map((d) => ({ id: d.id, date: d.date, title: d.title, emoji: DERIVED_META[d.kind].emoji })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const nextDate = (derived ?? [])
    .filter((d) => d.kind === "date" && d.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const { data: savings } = useQuery({
    queryKey: ["home-savings", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data: goals } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("created_at")
        .limit(1);
      const goal = goals?.[0];
      if (!goal) return null;
      const { data: contribs } = await supabase
        .from("savings_contributions")
        .select("amount")
        .eq("goal_id", goal.id);
      const saved = (contribs ?? []).reduce((s, c) => s + Number(c.amount), 0);
      return { goal, saved };
    },
  });

  return (
    <AppLayout title="Today" subtitle="Let's grow together" critter="cat">
      {/* Hero — days together with ring-style progress */}
      <section className="card-soft relative overflow-hidden bg-gradient-to-b from-primary/10 via-lavender-soft/40 to-card px-5 pb-6 pt-8 text-center">
        <Doodle critter="penguin" pose="wave" size={40} className="absolute -left-1 bottom-2 opacity-30" />
        <Doodle critter="seal" pose="love" size={36} className="absolute right-0 top-3 opacity-30" />

        <div className="relative mx-auto grid size-28 place-items-center">
          {/* soft ring */}
          <span
            className="absolute inset-0 rounded-full border-[3px] border-primary/25"
            style={{
              background: `conic-gradient(var(--primary) ${days !== null ? (days % 100) : 0}%, transparent 0)`,
              mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
            }}
          />
          <span className="grid size-[5.5rem] place-items-center rounded-full bg-card shadow-soft ring-2 ring-primary/15">
            <Doodle critter="cat" pose="love" size={52} />
          </span>
        </div>

        <p className="mt-4 font-display text-3xl font-extrabold text-primary">
          {days !== null ? `Day ${days}` : "—"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {partner
            ? days !== null
              ? `You & ${partner.display_name}`
              : "Add your anniversary in Profile"
            : "Share your invite code so your partner can join"}
        </p>

        {!partner ? (
          <Link
            to="/profile"
            className="press mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-float"
          >
            Pair with partner
          </Link>
        ) : untilAnniversary !== null ? (
          <p className="mt-3 text-xs font-bold text-primary">
            {untilAnniversary === 0
              ? "Anniversary is today 🩷"
              : `${untilAnniversary} days until your anniversary`}
          </p>
        ) : null}
      </section>

      {/* Growth / daily prompts — list rows like the mockup */}
      <SectionTitle
        action={
          <Link to="/questions" className="text-xs font-bold text-primary">
            See All
          </Link>
        }
      >
        Growth with your partner
      </SectionTitle>
      <div className="space-y-2">
        <Link to="/questions" className="card-soft press flex w-full items-center gap-3 p-3.5 text-left">
          <span className="tile-sky grid size-11 shrink-0 place-items-center rounded-2xl text-primary">
            <HelpCircle className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Daily
            </span>
            <span className="block truncate text-sm font-bold">Today&apos;s connection question</span>
          </span>
          {badges?.question ? (
            <span className="size-2.5 shrink-0 rounded-full bg-destructive" />
          ) : (
            <span className="text-muted-foreground">→</span>
          )}
        </Link>
        <Link to="/photos" className="card-soft press flex w-full items-center gap-3 p-3.5 text-left">
          <span className="tile-peach grid size-11 shrink-0 place-items-center rounded-2xl text-primary">
            <Images className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Memories
            </span>
            <span className="block truncate text-sm font-bold">Add a moment together</span>
          </span>
          <span className="text-muted-foreground">→</span>
        </Link>
        <Link to="/diary" className="card-soft press flex w-full items-center gap-3 p-3.5 text-left">
          <span className="tile-lilac grid size-11 shrink-0 place-items-center rounded-2xl text-primary">
            <span className="text-lg">📝</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Diary
            </span>
            <span className="block truncate text-sm font-bold">Write in your shared journal</span>
          </span>
          <span className="text-muted-foreground">→</span>
        </Link>
      </div>

      <SectionTitle>How you both feel</SectionTitle>
      <FeelingTile who={partner?.display_name ?? "Partner"} row={theirFeel ?? null} linkTo="/cooldown" />

      {/* Coming up */}
      <SectionTitle
        action={
          <Link to="/calendar" className="text-xs font-bold text-primary">
            See All
          </Link>
        }
      >
        Coming up
      </SectionTitle>
      {comingUp.length > 0 ? (
        <ul className="space-y-2">
          {comingUp.map((e) => (
            <li key={e.id} className="card-soft flex items-center gap-3 p-3.5">
              <span className="tile-peach grid size-11 shrink-0 place-items-center rounded-2xl text-lg text-primary">
                {e.emoji === "📅" ? <CalendarDays className="size-5" /> : e.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.date}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="text-sm text-muted-foreground">
          Nothing planned yet — add a date night!
        </Card>
      )}

      {/* Quick hops as colorful bento tiles */}
      <SectionTitle>Explore together</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/games"
          className="card-soft press flex flex-col gap-3 bg-gradient-to-br from-lavender-soft/80 to-card p-4"
        >
          <span className="text-2xl">🎮</span>
          <span>
            <span className="block text-sm font-bold">Games</span>
            <span className="text-[11px] text-muted-foreground">Play together</span>
          </span>
        </Link>
        <Link
          to="/nest"
          className="card-soft press flex flex-col gap-3 bg-gradient-to-br from-peach/50 to-card p-4"
        >
          <span className="text-2xl">🪺</span>
          <span>
            <span className="block text-sm font-bold">Our Nest</span>
            <span className="text-[11px] text-muted-foreground">Budget & goals</span>
          </span>
        </Link>
        <Link
          to="/chat"
          className="card-soft press flex flex-col gap-3 bg-gradient-to-br from-primary/10 to-card p-4"
        >
          <span className="text-2xl">💬</span>
          <span>
            <span className="block text-sm font-bold">Chat</span>
            <span className="text-[11px] text-muted-foreground">Private messages</span>
          </span>
        </Link>
        <Link
          to="/wellbeing"
          className="card-soft press flex flex-col gap-3 bg-gradient-to-br from-sky/50 to-card p-4"
        >
          <span className="text-2xl">🌿</span>
          <span>
            <span className="block text-sm font-bold">Wellbeing</span>
            <span className="text-[11px] text-muted-foreground">Care & cycle</span>
          </span>
        </Link>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Next date night
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary">
            {nextDate
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(`${nextDate.date}T00:00:00`).getTime() -
                      new Date(`${todayISO()}T00:00:00`).getTime()) /
                      86_400_000,
                  ),
                )
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {nextDate ? "days away" : "none planned"}
          </p>
        </StatCard>
        <StatCard className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Anniversary
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary">
            {untilAnniversary !== null ? untilAnniversary : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {untilAnniversary !== null ? "days to go" : "set in profile"}
          </p>
        </StatCard>
      </div>

      {savings ? (
        <>
          <SectionTitle
            action={
              <Link to="/budget" className="text-xs font-bold text-primary">
                See All
              </Link>
            }
          >
            Joint savings
          </SectionTitle>
          <Card>
            <div className="mb-2 flex items-center gap-2">
              <span className="tile-pink grid size-10 place-items-center rounded-2xl">
                <PiggyBank className="size-5 text-primary" />
              </span>
              <p className="text-sm font-bold">{savings.goal.title}</p>
            </div>
            <ProgressBar
              value={(savings.saved / Number(savings.goal.target_amount)) * 100}
              tone="pink"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              <Money value={savings.saved} /> of <Money value={Number(savings.goal.target_amount)} />
            </p>
          </Card>
        </>
      ) : null}
    </AppLayout>
  );
}

