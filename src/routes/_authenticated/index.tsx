import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Gamepad2,
  Heart,
  Images,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Doodle } from "@/components/Doodles";
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

  const name = profile?.display_name ?? "there";

  return (
    <AppLayout title="BLUBLUB" subtitle={partner ? `With ${partner.display_name}` : "Your space"}>
      {/* Greeting */}
      <div className="pb-4 pt-1">
        <p className="font-display text-[1.65rem] font-bold leading-tight tracking-tight text-foreground">
          {greetingForHour()}, {name}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {days !== null
            ? `Day ${days} together — make it count`
            : "We wish you a good day"}
        </p>
      </div>

      {/* 2 feature tiles – new palette */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/questions"
          className="grad-box press relative flex min-h-[168px] flex-col justify-between overflow-hidden rounded-[1.25rem] p-4 text-white"
          style={{ backgroundColor: "var(--primary, #FFAFCC)", color: "#3F2A3A" }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Daily</p>
            <p className="mt-1 font-display text-lg font-bold leading-snug">Question</p>
            <p className="mt-1 text-[11px] opacity-80">{questionHint}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Doodle critter="cat" pose="wave" size={44} className="opacity-90" />
            <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#3F2A3A]">
              {questionCta}
            </span>
          </div>
          {badges?.question ? (
            <span className="absolute right-3 top-3 size-2 rounded-full bg-white" />
          ) : null}
        </Link>

        <Link
          to="/photos"
          className="grad-box press relative flex min-h-[168px] flex-col justify-between overflow-hidden rounded-[1.25rem] p-4"
          style={{ backgroundColor: "var(--petal, #FFC8DD)", color: "#3F2A3A" }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Album</p>
            <p className="mt-1 font-display text-lg font-bold leading-snug">Memories</p>
            <p className="mt-1 text-[11px] opacity-80">
              {latestPhoto ? "See your latest" : "Add a moment"}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            {latestPhoto?.url ? (
              <img
                src={latestPhoto.url}
                alt=""
                className="size-11 rounded-xl object-cover ring-2 ring-white/50"
              />
            ) : (
              <Images className="size-8 opacity-70" />
            )}
            <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold">
              Open
            </span>
          </div>
        </Link>
      </div>

      {/* How they feel */}
      <p className="mb-1 mt-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        How they feel
      </p>
      <div
        className="grad-box rounded-[1.25rem] py-2"
        style={{ backgroundColor: "color-mix(in oklab, var(--lavender, #CDB4DB) 25%, white)" }}
      >
        <FeelingTile
          who={partner?.display_name ?? "Partner"}
          row={theirFeel ?? null}
          linkTo="/cooldown"
        />
      </div>

      {/* Days / anniversary */}
      {(days !== null || untilAnniversary !== null) && (
        <div className="mt-3 flex gap-3">
          {days !== null ? (
            <div className="grad-box flex-1 rounded-[1.25rem] bg-muted px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Together
              </p>
              <p className="font-display text-xl font-bold text-foreground">Day {days}</p>
            </div>
          ) : null}
          {untilAnniversary !== null ? (
            <div
              className="grad-box flex-1 rounded-[1.25rem] px-4 py-3"
              style={{ backgroundColor: "color-mix(in oklab, var(--lavender, #CDB4DB) 30%, white)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Anniversary
              </p>
              <p className="font-display text-xl font-bold" style={{ color: "var(--lavender, #CDB4DB)" }}>
                {untilAnniversary === 0 ? "Today" : `${untilAnniversary}d`}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* For you both */}
      <div className="mb-2 mt-7 flex items-end justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">For you both</h2>
        <Link to="/more" className="text-xs font-semibold text-primary">
          See all
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2">
        <Link
          to="/games"
          className="grad-box press col-span-1 flex min-h-[150px] flex-col justify-between rounded-[1.25rem] p-4"
          style={{ backgroundColor: "var(--icy, #BDE0FE)", color: "#3F2A3A" }}
        >
          <Gamepad2 className="size-7 opacity-80" />
          <div>
            <p className="font-display text-base font-bold">Games</p>
            <p className="text-[11px] opacity-70">Play together</p>
          </div>
        </Link>

        <Link
          to="/chat"
          className="grad-box press relative flex min-h-[150px] flex-col justify-between rounded-[1.25rem] p-4"
          style={{ backgroundColor: "var(--petal, #FFC8DD)", color: "#3F2A3A" }}
        >
          <MessageCircle className="size-7 opacity-80" />
          <div>
            <p className="font-display text-base font-bold">Chat</p>
            <p className="text-[11px] opacity-70">Private messages</p>
          </div>
          {badges?.unreadChat ? (
            <span className="absolute right-3 top-3 size-2 rounded-full bg-primary" />
          ) : null}
        </Link>

        <Link
          to="/calendar"
          className="grad-box press flex min-h-[120px] flex-col justify-between rounded-[1.25rem] p-4"
          style={{ backgroundColor: "var(--lavender, #CDB4DB)", color: "#3F2A3A" }}
        >
          <CalendarDays className="size-6 opacity-80" />
          <div>
            <p className="font-display text-base font-bold">Calendar</p>
            <p className="truncate text-[11px] opacity-70">
              {nextSpecial ? nextSpecial.title : "Plans & dates"}
            </p>
          </div>
        </Link>

        <Link
          to="/map"
          className="grad-box press flex min-h-[120px] flex-col justify-between rounded-[1.25rem] p-4"
          style={{ backgroundColor: "var(--sky, #A2D2FF)", color: "#3F2A3A" }}
        >
          <MapPin className="size-6 opacity-80" />
          <div>
            <p className="font-display text-base font-bold">Where we are</p>
            <p className="text-[11px] opacity-70">Shared location</p>
          </div>
        </Link>
      </div>

      {!partner ? (
        <Link
          to="/profile"
          className="press mt-4 flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold"
          style={{ backgroundColor: "var(--primary, #FFAFCC)", color: "#3F2A3A" }}
        >
          <Heart className="size-4" />
          Pair with partner
        </Link>
      ) : null}
    </AppLayout>
  );
}
