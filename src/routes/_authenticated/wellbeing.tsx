import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Droplets,
  HeartHandshake,
  LayoutGrid,
  MapPin,
  Target,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useCoupleId, usePartner, useProfile } from "@/lib/session";
import { useLocations, timeAgo } from "@/lib/location";
import { todayISO } from "@/lib/badges";
import { FEELING_BY_KEY, decodeFeeling } from "@/lib/feelings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/wellbeing")({
  head: () => ({
    meta: [
      { title: "Partner's Wellbeing — BLUBLUB" },
      {
        name: "description",
        content: "Cool-down tool, cycle tracking and live location in one caring space.",
      },
      { property: "og:title", content: "Partner's Wellbeing — BLUBLUB" },
      {
        property: "og:description",
        content: "Cool-down tool, cycle tracking and live location in one caring space.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WellbeingPage,
});

const TOOLS = [
  {
    id: "all",
    to: "/cooldown",
    label: "Cool-Down",
    hint: "Pause & reconnect",
    icon: HeartHandshake,
    featured: true,
    accent: "from-[#5B6CFF] to-[#8E97FD]",
  },
  {
    id: "cycle",
    to: "/period",
    label: "Cycle",
    hint: "Phase & predictions",
    icon: Droplets,
    tile: "bg-[#FFC97E]",
    text: "text-[#3F414E]",
  },
  {
    id: "commit",
    to: "/commitments",
    label: "Commitments",
    hint: "Gentle streaks",
    icon: Target,
    tile: "bg-[#AFDBC5]",
    text: "text-[#3F414E]",
  },
  {
    id: "map",
    to: "/map",
    label: "Where We Are",
    hint: "Live location",
    icon: MapPin,
    tile: "bg-[#E0D7FF]",
    text: "text-[#3F414E]",
  },
] as const;

type FilterId = "all" | "feel" | "cycle" | "map" | "commit";

const FILTERS: { id: FilterId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "feel", label: "Feel", icon: HeartHandshake },
  { id: "cycle", label: "Cycle", icon: Droplets },
  { id: "map", label: "Map", icon: MapPin },
  { id: "commit", label: "Goals", icon: Target },
];

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

function WellbeingPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const partner = usePartner();
  const { data: locations } = useLocations();
  const [filter, setFilter] = useState<FilterId>("all");

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

  const latestCool = cooldowns?.find((c) => c.created_by === user?.id || c.shared);
  const coolDecoded = decodeFeeling(latestCool?.feeling ?? "");
  const coolMoods = coolDecoded.keys
    .map((k) => FEELING_BY_KEY.get(k)?.label)
    .filter(Boolean) as string[];
  const coolValue = latestCool
    ? coolMoods.length
      ? `${latestCool.created_by === user?.id ? "You" : (partner?.display_name ?? "Partner")} feels ${coolMoods.slice(0, 2).join(", ")}`
      : coolDecoded.text.slice(0, 48) || "A note was shared"
    : "No feelings shared yet";
  const coolDetail = latestCool
    ? `${latestCool.needs ? `Needs: ${latestCool.needs} · ` : ""}${timeAgo(latestCool.created_at)}`
    : "Open cool-down to share";

  const sharedCycle = (cycles ?? []).find((c) => c.user_id !== user?.id && c.shared);
  const myLatest = (cycles ?? []).find((c) => c.user_id === user?.id);
  const cycleSrc = sharedCycle ?? myLatest;
  const nextStart = cycleSrc
    ? addDays(cycleSrc.start_date, cycleSrc.cycle_length)
    : null;
  const cycleValue = nextStart
    ? `Next period in ${Math.max(0, daysUntil(nextStart))} days`
    : "No cycle logged";
  const cycleDetail = cycleSrc
    ? `Phase now: ${phaseFor(cycleSrc.start_date, cycleSrc.cycle_length, cycleSrc.period_length)} · ${cycleSrc.start_date}`
    : "Log a cycle or turn sharing on";

  const mine = locations?.find((l) => l.user_id === user?.id);
  const theirs = locations?.find((l) => l.user_id && l.user_id === partner?.id);
  const km = mine && theirs ? distanceKm(mine, theirs) : null;
  const distValue =
    km === null
      ? !profile?.share_location
        ? "Your sharing is off"
        : "Waiting for a location"
      : km < 0.1
        ? "You're together right now"
        : km < 1
          ? `${Math.round(km * 1000)} m apart`
          : `${km.toFixed(km < 10 ? 1 : 0)} km apart`;
  const distDetail = theirs
    ? `${partner?.display_name ?? "Partner"} updated ${timeAgo(theirs.updated_at)}`
    : "Both of you need location sharing on";

  const showFeel = filter === "all" || filter === "feel";
  const showCycle = filter === "all" || filter === "cycle";
  const showMap = filter === "all" || filter === "map";
  const showCommit = filter === "all" || filter === "commit";

  return (
    <AppLayout title="Care" subtitle="Taking care of each other" critter="seal">
      {/* —— Right now (kept) —— */}
      <p className="mb-3 font-display text-lg font-bold text-[#3F414E]">Right now</p>
      <div className="grid gap-3">
        <Link
          to="/cooldown"
          className="press block rounded-[1.25rem] bg-[#D4E5FF] p-4"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#5B6CFF]">
            <HeartHandshake className="size-3.5" />
            Feelings
          </span>
          <span className="mt-1.5 block text-sm font-bold leading-snug text-[#3F414E]">
            {coolValue}
          </span>
          <span className="mt-0.5 block text-xs text-[#A1A4B2]">{coolDetail}</span>
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/period" className="press block rounded-[1.25rem] bg-[#FFE4C8] p-4">
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#C47A2C]">
              <Droplets className="size-3.5" />
              Cycle
            </span>
            <span className="mt-1.5 block text-sm font-bold leading-snug text-[#3F414E]">
              {cycleValue}
            </span>
            <span className="mt-0.5 block text-xs text-[#A1A4B2]">{cycleDetail}</span>
          </Link>
          <Link to="/map" className="press block rounded-[1.25rem] bg-[#FFF3D6] p-4">
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#B8860B]">
              <MapPin className="size-3.5" />
              Distance
            </span>
            <span className="mt-1.5 block text-sm font-bold leading-snug text-[#3F414E]">
              {distValue}
            </span>
            <span className="mt-0.5 block text-xs text-[#A1A4B2]">{distDetail}</span>
          </Link>
        </div>
      </div>

      {/* —— Sleep-stories style tools —— */}
      <div className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-[#1F2757] px-4 pb-5 pt-6 text-white">
        <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-[#8E97FD]/25 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-10 size-24 rounded-full bg-[#5B6CFF]/20 blur-2xl" />

        <div className="relative text-center">
          <p className="font-display text-2xl font-bold">Care tools</p>
          <p className="mx-auto mt-1 max-w-[16rem] text-xs text-white/70">
            Soft tools for feelings, cycles, distance and gentle goals
          </p>
        </div>

        {/* Filter chips */}
        <div className="relative mt-5 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "press flex shrink-0 flex-col items-center gap-1",
                )}
              >
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-full",
                    active ? "bg-[#8E97FD] text-white" : "bg-white/10 text-white/80",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-[10px] font-semibold text-white/80">{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Featured hero card */}
        {showFeel ? (
          <Link
            to="/cooldown"
            className="press relative mt-5 block overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#3D4FBF] to-[#6B7CFF] p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              Featured
            </p>
            <p className="mt-1 font-display text-xl font-bold">Cool-Down Tool</p>
            <p className="mt-1 max-w-[14rem] text-xs text-white/80">
              Pause, name the feeling, and reconnect with each other
            </p>
            <span className="mt-4 inline-flex rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#1F2757]">
              Start
            </span>
            <HeartHandshake className="absolute bottom-4 right-4 size-14 text-white/20" />
          </Link>
        ) : null}

        {/* Mixed grid */}
        <div className="relative mt-3 grid grid-cols-2 gap-3">
          {showCycle ? (
            <Link
              to="/period"
              className="press flex min-h-[130px] flex-col justify-between rounded-[1.25rem] bg-[#FFC97E] p-4 text-[#3F414E]"
            >
              <Droplets className="size-7 opacity-80" />
              <div>
                <p className="font-display text-base font-bold">Cycle</p>
                <p className="text-[11px] opacity-70">Phase & predictions</p>
              </div>
            </Link>
          ) : null}
          {showCommit ? (
            <Link
              to="/commitments"
              className="press flex min-h-[130px] flex-col justify-between rounded-[1.25rem] bg-[#AFDBC5] p-4 text-[#3F414E]"
            >
              <Target className="size-7 opacity-80" />
              <div>
                <p className="font-display text-base font-bold">Commitments</p>
                <p className="text-[11px] opacity-70">Gentle streaks</p>
              </div>
            </Link>
          ) : null}
          {showMap ? (
            <Link
              to="/map"
              className={cn(
                "press flex min-h-[110px] flex-col justify-between rounded-[1.25rem] bg-[#E0D7FF] p-4 text-[#3F414E]",
                showCycle && showCommit ? "col-span-2" : "col-span-1",
              )}
            >
              <MapPin className="size-6 opacity-80" />
              <div>
                <p className="font-display text-base font-bold">Where We Are</p>
                <p className="text-[11px] opacity-70">Live location when shared</p>
              </div>
            </Link>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}
