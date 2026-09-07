import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
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
      {/* ===== Sleep Stories style dark panel ===== */}
      <div
        className="relative overflow-hidden px-4 pb-6 pt-5 text-white"
        style={{
          borderRadius: "var(--panel-radius, 1.75rem)",
          background: "linear-gradient(180deg, var(--grad-panel-from, #2A1F3D), var(--grad-panel-to, #1A1528))",
        }}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-[#CDB4DB]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-6 size-28 rounded-full bg-[#FFAFCC]/20 blur-3xl" />
        <div className="pointer-events-none absolute right-14 top-28 size-18 rounded-full bg-[#A2D2FF]/15 blur-2xl" />

        {/* Header – matches Figma */}
        <div className="relative text-center">
          <p className="font-display text-[1.65rem] font-bold leading-tight">Care Stories</p>
          <p className="mx-auto mt-1 max-w-[17rem] text-[11px] leading-snug text-white/65">
            Soft tools to help you both feel seen, safe and close
          </p>
        </div>

        {/* Filter chips – exact Sleep Stories pattern */}
        <div className="relative mt-5 flex gap-3 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className="press flex shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className="grid size-12 place-items-center rounded-full transition-colors"
                  style={{
                    backgroundColor: active ? "#FFAFCC" : "rgba(255,255,255,0.12)",
                    color: active ? "#3F2A3A" : "rgba(255,255,255,0.85)",
                  }}
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-[10px] font-semibold text-white/80">{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Featured card */}
        {showFeel && (
          <Link
            to="/cooldown"
            className="press relative mt-5 block overflow-hidden p-5"
            style={{
              borderRadius: "1.35rem",
              background: "linear-gradient(135deg, var(--grad-featured-from, #CDB4DB), var(--grad-featured-to, #FFAFCC))",
              color: "#3F2A3A",
            }}
          >
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Featured</p>
              <p className="mt-1 font-display text-xl font-bold">Cool-Down Tool</p>
              <p className="mt-1 max-w-[14rem] text-xs leading-snug opacity-80">
                Pause, name the feeling, and reconnect with each other
              </p>
              <span
                className="mt-4 inline-flex rounded-full bg-white px-5 py-1.5 text-xs font-bold"
                style={{ color: "#3F2A3A" }}
              >
                Start
              </span>
            </div>
            <HeartHandshake className="absolute -bottom-2 -right-2 size-24 opacity-15" />
          </Link>
        )}

        {/* Smaller cards grid */}
        <div className="relative mt-3 grid grid-cols-2 gap-3">
          {showCycle && (
            <Link
              to="/period"
              className="press flex min-h-[140px] flex-col justify-between p-4"
              style={{
                borderRadius: "1.25rem",
                backgroundColor: "#FFC8DD",
                color: "#3F2A3A",
              }}
            >
              <Droplets className="size-8 opacity-80" />
              <div>
                <p className="font-display text-[15px] font-bold">Cycle</p>
                <p className="text-[11px] opacity-70">Phase & predictions</p>
              </div>
            </Link>
          )}
          {showCommit && (
            <Link
              to="/commitments"
              className="press flex min-h-[140px] flex-col justify-between p-4"
              style={{
                borderRadius: "1.25rem",
                backgroundColor: "#CDB4DB",
                color: "#3F2A3A",
              }}
            >
              <Target className="size-8 opacity-80" />
              <div>
                <p className="font-display text-[15px] font-bold">Commitments</p>
                <p className="text-[11px] opacity-70">Gentle streaks</p>
              </div>
            </Link>
          )}
          {showMap && (
            <Link
              to="/map"
              className={cn(
                "press flex min-h-[110px] flex-col justify-between p-4",
                showCycle && showCommit ? "col-span-2" : "col-span-1",
              )}
              style={{
                borderRadius: "1.25rem",
                backgroundColor: "#BDE0FE",
                color: "#3F2A3A",
              }}
            >
              <MapPin className="size-7 opacity-80" />
              <div>
                <p className="font-display text-[15px] font-bold">Where We Are</p>
                <p className="text-[11px] opacity-70">Live location when shared</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Quick status row outside panel */}
      <p className="mb-2 mt-5 font-display text-base font-bold text-foreground">Right now</p>
      <div className="grid gap-2.5">
        <Link
          to="/cooldown"
          className="press block rounded-[1.15rem] bg-[#BDE0FE]/45 p-3.5"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Feelings</p>
          <p className="mt-0.5 text-sm font-bold leading-snug">{coolValue}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{coolDetail}</p>
        </Link>
        <div className="grid grid-cols-2 gap-2.5">
          <Link to="/period" className="press block rounded-[1.15rem] bg-[#FFC8DD]/40 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Cycle</p>
            <p className="mt-0.5 text-sm font-bold leading-snug">{cycleValue}</p>
          </Link>
          <Link to="/map" className="press block rounded-[1.15rem] bg-[#CDB4DB]/35 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Distance</p>
            <p className="mt-0.5 text-sm font-bold leading-snug">{distValue}</p>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
