import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Heart, Images, MessageCircle } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Doodle } from "@/components/Doodles";
import { FeelingTile } from "@/components/FeelingTile";
import { NotificationBell } from "@/components/NotificationBell";
import { LinkRow, RowGroup } from "@/components/ui-kit";
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

  const name = profile?.display_name;
  const partnerName = partner?.display_name ?? "Your partner";

  const together = [
    days !== null ? `Day ${days} together` : null,
    untilAnniversary === 0
      ? "Happy anniversary!"
      : untilAnniversary !== null && untilAnniversary <= 60
        ? `${untilAnniversary} ${untilAnniversary === 1 ? "day" : "days"} to your anniversary`
        : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AppLayout
      title="Today"
      subtitle={partner ? `You & ${partner.display_name}` : "Your space"}
      critter="cat"
      critterPose="wave"
    >
      <div className="flex items-start justify-between gap-3 pb-5 pt-1">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[1.65rem] font-bold leading-tight">
            {greetingForHour()}
            {name ? `, ${name}` : ""}
          </p>
          {together ? <p className="mt-1 text-sm text-muted-foreground">{together}</p> : null}
        </div>
        <NotificationBell className="shrink-0" />
      </div>

      {/* The one thing to do today */}
      <Link
        to="/questions"
        className="press relative flex items-center gap-3 overflow-hidden rounded-[1.5rem] bg-primary p-5 text-primary-foreground shadow-float"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold leading-snug">Today&apos;s question</p>
          <p className="mt-1 text-sm">{questionHint}</p>
          <span className="mt-4 inline-flex min-h-11 items-center rounded-full bg-card px-5 text-sm font-bold text-card-foreground">
            {questionCta}
          </span>
        </div>
        <Doodle
          critter="cat"
          pose={bothAnswered ? "love" : partnerAnswered ? "curious" : iAnswered ? "sleep" : "wave"}
          size={96}
        />
        {badges?.question ? (
          <span className="absolute right-4 top-4 size-2.5 rounded-full bg-card">
            <span className="sr-only">New</span>
          </span>
        ) : null}
      </Link>

      <RowGroup title={partner ? `How ${partner.display_name} feels` : "How they feel"}>
        <li>
          <FeelingTile who="" row={theirFeel ?? null} linkTo="/cooldown" compact />
        </li>
      </RowGroup>

      <RowGroup title="Coming up">
        {badges?.unreadChat ? (
          <LinkRow
            to="/chat"
            icon={<MessageCircle className="size-5" />}
            tint="tile-pink"
            title={`New message from ${partnerName}`}
            status="Tap to read"
            dot
          />
        ) : null}
        <LinkRow
          to="/calendar"
          icon={<CalendarDays className="size-5" />}
          tint="tile-lilac"
          title={nextSpecial ? nextSpecial.title : "Nothing planned yet"}
          status={nextSpecial ? whenLabel(nextSpecial.date) : "Plan a date together"}
        />
      </RowGroup>

      {latestPhoto?.url ? (
        <section className="mt-7">
          <h2 className="mb-2 px-1 font-display text-lg font-bold">Latest memory</h2>
          <Link to="/photos" className="card-soft press block overflow-hidden">
            <img
              src={latestPhoto.url}
              alt={latestPhoto.caption || "Your latest memory"}
              className="aspect-[4/3] w-full object-cover"
            />
            <span className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {latestPhoto.caption || "A moment together"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {format(parseISO(latestPhoto.taken_on), "d MMMM yyyy")}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </span>
          </Link>
        </section>
      ) : (
        <RowGroup title="Memories">
          <LinkRow
            to="/photos"
            icon={<Images className="size-5" />}
            tint="tile-sky"
            title="Add your first memory"
            status="A photo, a caption, a date"
          />
        </RowGroup>
      )}

      {!partner ? (
        <Link
          to="/profile"
          className="press mt-7 flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground"
        >
          <Heart className="size-4" />
          Pair with your partner
        </Link>
      ) : null}
    </AppLayout>
  );
}

function whenLabel(iso: string) {
  const diff = differenceInCalendarDays(parseISO(iso), new Date());
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${format(parseISO(iso), "EEE d MMM")} · in ${diff} days`;
}
