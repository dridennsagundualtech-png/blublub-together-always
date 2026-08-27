import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, HelpCircle, Images, PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Doodle } from "@/components/Doodles";
import { Card, Money, ProgressBar, SectionTitle, StatCard, StatHero } from "@/components/ui-kit";
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
    <AppLayout title="BLUBLUB" subtitle={`Hi ${profile?.display_name ?? "you"} 🩷`} critter="cat">
      <StatHero className="text-center">
        <Doodle critter="penguin" pose="wave" size={48} className="absolute -left-1 bottom-1 opacity-40" />
        <Doodle critter="seal" pose="peek" size={40} className="absolute right-1 top-1 opacity-35" />

        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Days together
        </p>
        <p className="mt-1 font-display text-5xl font-extrabold text-primary">
          {days !== null ? `Day ${days}` : "—"}
        </p>
        {days !== null ? (
          <div className="mx-auto mt-3 max-w-xs">
            <ProgressBar value={((days % 100) / 100) * 100} />
            <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {100 - (days % 100)} days to day {Math.floor(days / 100) * 100 + 100}
            </p>
          </div>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          {partner
            ? days !== null
              ? `You and ${partner.display_name}`
              : "Add your anniversary in Profile to start counting."
            : "Share your invite code so your partner can join."}
        </p>
      </StatHero>


      <div className="mt-3 grid grid-cols-2 gap-3">
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
          <p className="truncate text-xs text-muted-foreground">
            {nextDate ? `days · ${nextDate.title}` : "nothing planned"}
          </p>
        </StatCard>
        <StatCard className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Anniversary in
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary">{untilAnniversary ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {untilAnniversary === null ? "add a date" : "days"}
          </p>
        </StatCard>
      </div>

      <SectionTitle>How they feel</SectionTitle>
      <FeelingTile who={partner?.display_name ?? "Partner"} row={theirFeel ?? null} linkTo="/cooldown" />

      <SectionTitle>Coming up</SectionTitle>
      {comingUp.length > 0 ? (
        <ul className="space-y-2">
          {comingUp.map((e) => (
            <li key={e.id} className="card-soft flex items-center gap-3 p-4">
              <span className="tile-peach grid size-11 shrink-0 place-items-center rounded-2xl text-lg text-primary">
                {e.emoji === "📅" ? <CalendarDays className="size-5" /> : e.emoji}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.date}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="text-sm text-muted-foreground">Nothing planned yet — add a date!</Card>
      )}

      <SectionTitle>Quick hops</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/questions" className="card-soft press relative flex flex-col gap-3 p-4">
          <span className="tile-lilac grid size-11 place-items-center rounded-2xl text-primary">
            <HelpCircle className="size-5" />
          </span>
          <span className="text-sm font-bold">Today&apos;s question</span>
          {badges?.question ? (
            <span className="absolute right-3 top-3 size-2.5 rounded-full bg-destructive" />
          ) : null}
        </Link>
        <Link to="/photos" className="card-soft press flex flex-col gap-3 p-4">
          <span className="tile-sky grid size-11 place-items-center rounded-2xl text-primary">
            <Images className="size-5" />
          </span>
          <span className="text-sm font-bold">Memories</span>
        </Link>
      </div>


      {savings ? (
        <>
          <SectionTitle>Joint savings</SectionTitle>
          <Card>
            <div className="mb-2 flex items-center gap-2">
              <PiggyBank className="size-5 text-primary" />
              <p className="text-sm font-bold">{savings.goal.title}</p>
            </div>
            <ProgressBar value={(savings.saved / Number(savings.goal.target_amount)) * 100} />
            <p className="mt-2 text-xs text-muted-foreground">
              <Money value={savings.saved} /> of <Money value={Number(savings.goal.target_amount)} />
            </p>
          </Card>
        </>
      ) : null}
    </AppLayout>
  );
}
