import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronRight,
  Gamepad2,
  Heart,
  HelpCircle,
  Images,
  MapPin,
  MessageCircle,
  Play,
  Sparkles,
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
      {/* Greeting — Silent Moon style */}
      <div className="pt-1 pb-4">
        <p className="font-display text-[1.65rem] font-bold leading-tight tracking-tight text-[#3F414E]">
          {greetingForHour()}, {name}
        </p>
        <p className="mt-1 text-sm text-[#A1A4B2]">
          {days !== null
            ? `Day ${days} together — make it count`
            : "We wish you a good day"}
        </p>
      </div>

      {/* 2 unequal feature tiles */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tall-ish purple tile — Daily question */}
        <Link
          to="/questions"
          className="press relative flex min-h-[168px] flex-col justify-between overflow-hidden rounded-[1.25rem] bg-[#8E97FD] p-4 text-white"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
              Daily
            </p>
            <p className="mt-1 font-display text-lg font-bold leading-snug">Question</p>
            <p className="mt-1 text-[11px] text-white/85">{questionHint}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Doodle critter="cat" pose="wave" size={44} className="opacity-90" />
            <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#3F414E]">
              {questionCta}
            </span>
          </div>
          {badges?.question ? (
            <span className="absolute right-3 top-3 size-2 rounded-full bg-white" />
          ) : null}
        </Link>

        {/* Warm tile — Memories */}
        <Link
          to="/photos"
          className="press relative flex min-h-[168px] flex-col justify-between overflow-hidden rounded-[1.25rem] bg-[#FFC97E] p-4 text-[#3F414E]"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3F414E]/70">
              Album
            </p>
            <p className="mt-1 font-display text-lg font-bold leading-snug">Memories</p>
            <p className="mt-1 text-[11px] text-[#3F414E]/80">
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

      {/* Wide featured banner — like Daily Thought */}
      <Link
        to="/cooldown"
        className="press mt-3 flex items-center gap-3 overflow-hidden rounded-[1.25rem] bg-[#3F414E] px-4 py-4 text-white"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold">How they feel</p>
          <p className="mt-0.5 truncate text-xs text-white/70">
            {theirFeel
              ? `${partner?.display_name ?? "Partner"} shared a feeling`
              : "Open the cool-down tool"}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15">
          <Play className="size-4 fill-white text-white" />
        </span>
      </Link>

      {/* Days / anniversary strip — different shape again */}
      {(days !== null || untilAnniversary !== null) && (
        <div className="mt-3 flex gap-3">
          {days !== null ? (
            <div className="flex-1 rounded-[1.25rem] bg-[#F2F2F2] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#A1A4B2]">
                Together
              </p>
              <p className="font-display text-xl font-bold text-[#3F414E]">Day {days}</p>
            </div>
          ) : null}
          {untilAnniversary !== null ? (
            <div className="flex-1 rounded-[1.25rem] bg-[#F6F1FB] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#A1A4B2]">
                Anniversary
              </p>
              <p className="font-display text-xl font-bold text-[#8E97FD]">
                {untilAnniversary === 0 ? "Today" : `${untilAnniversary}d`}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Recommended — mixed sizes like Silent Moon */}
      <div className="mb-2 mt-7 flex items-end justify-between">
        <h2 className="font-display text-xl font-bold text-[#3F414E]">For you both</h2>
        <Link to="/more" className="text-xs font-semibold text-[#8E97FD]">
          See all
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2">
        {/* Large-ish tile */}
        <Link
          to="/games"
          className="press col-span-1 flex min-h-[150px] flex-col justify-between rounded-[1.25rem] bg-[#AFDBC5] p-4"
        >
          <Gamepad2 className="size-7 text-[#3F414E]/80" />
          <div>
            <p className="font-display text-base font-bold text-[#3F414E]">Games</p>
            <p className="text-[11px] text-[#3F414E]/70">Play together</p>
          </div>
        </Link>

        <Link
          to="/chat"
          className="press relative flex min-h-[150px] flex-col justify-between rounded-[1.25rem] bg-[#FECFCF] p-4"
        >
          <MessageCircle className="size-7 text-[#3F414E]/80" />
          <div>
            <p className="font-display text-base font-bold text-[#3F414E]">Chat</p>
            <p className="text-[11px] text-[#3F414E]/70">Private messages</p>
          </div>
          {badges?.unreadChat ? (
            <span className="absolute right-3 top-3 size-2 rounded-full bg-[#8E97FD]" />
          ) : null}
        </Link>

        <Link
          to="/calendar"
          className="press flex min-h-[120px] flex-col justify-between rounded-[1.25rem] bg-[#E0D7FF] p-4"
        >
          <CalendarDays className="size-6 text-[#3F414E]/80" />
          <div>
            <p className="font-display text-base font-bold text-[#3F414E]">Calendar</p>
            <p className="truncate text-[11px] text-[#3F414E]/70">
              {nextSpecial ? nextSpecial.title : "Plans & dates"}
            </p>
          </div>
        </Link>

        <Link
          to="/map"
          className="press flex min-h-[120px] flex-col justify-between rounded-[1.25rem] bg-[#D9E8FF] p-4"
        >
          <MapPin className="size-6 text-[#3F414E]/80" />
          <div>
            <p className="font-display text-base font-bold text-[#3F414E]">Where we are</p>
            <p className="text-[11px] text-[#3F414E]/70">Shared location</p>
          </div>
        </Link>
      </div>

      {!partner ? (
        <Link
          to="/profile"
          className="press mt-4 flex items-center justify-center gap-2 rounded-full bg-[#8E97FD] py-3.5 text-sm font-bold text-white"
        >
          <Heart className="size-4" />
          Pair with partner
        </Link>
      ) : null}
    </AppLayout>
  );
}
