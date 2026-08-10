import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Droplets, HeartHandshake, MapPin } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SectionTitle } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useCoupleId, usePartner, useProfile } from "@/lib/session";
import { useLocations, timeAgo } from "@/lib/location";
import { todayISO } from "@/lib/badges";


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

const SECTIONS = [
  {
    to: "/cooldown",
    label: "Cool-Down Tool",
    hint: "Pause, name the feeling, reconnect",
    icon: HeartHandshake,
    tint: "tile-sky",
  },
  {
    to: "/period",
    label: "Cycle Tracking",
    hint: "Phase & next predicted date",
    icon: Droplets,
    tint: "tile-peach",
  },
  {
    to: "/map",
    label: "Where We Are",
    hint: "Live location, when shared",
    icon: MapPin,
    tint: "tile-cream",
  },
] as const;

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
  return Math.round((Date.parse(`${iso}T00:00:00`) - Date.parse(`${todayISO()}T00:00:00`)) / 86_400_000);
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

function SummaryTile({
  to,
  icon: Icon,
  tint,
  label,
  value,
  detail,
}: {
  to: string;
  icon: typeof MapPin;
  tint: string;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Link to={to} className={`card-soft press block p-4 ${tint}`}>
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {label}
      </span>
      <span className="mt-1.5 block text-sm font-bold leading-snug">{value}</span>
      {detail ? (
        <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
      ) : null}
    </Link>
  );
}

function WellbeingPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const partner = usePartner();
  const { data: locations } = useLocations();

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

  // Cool-down summary — the most recent note I'm allowed to see.
  const latestCool = cooldowns?.find((c) => c.created_by === user?.id || c.shared);
  const coolValue = latestCool
    ? `${latestCool.created_by === user?.id ? "You feel" : `${partner?.display_name ?? "Partner"} feels`} “${latestCool.feeling.slice(0, 60)}”`
    : "No feelings logged yet";
  const coolDetail = latestCool
    ? `Needs: ${latestCool.need.slice(0, 50) || "—"} · ${timeAgo(latestCool.created_at)}`
    : "Open the tool to name a feeling together";

  // Cycle summary — next predicted period and current phase.
  const latestCycle = cycles?.[0];
  const canSeeCycle =
    !!latestCycle &&
    (latestCycle.user_id === user?.id ||
      (latestCycle.user_id === partner?.id && !!partner?.share_cycle));
  const nextStart = latestCycle ? addDays(latestCycle.start_date, latestCycle.cycle_length) : null;
  const untilNext = nextStart ? daysUntil(nextStart) : null;
  const cycleValue = !canSeeCycle
    ? "No cycle shared yet"
    : untilNext === null
      ? "—"
      : untilNext > 0
        ? `Next period in ${untilNext} day${untilNext === 1 ? "" : "s"}`
        : untilNext === 0
          ? "Next period expected today"
          : `Period was due ${Math.abs(untilNext)} day${Math.abs(untilNext) === 1 ? "" : "s"} ago`;
  const cycleDetail =
    canSeeCycle && latestCycle
      ? `Phase now: ${phaseFor(latestCycle.start_date, latestCycle.cycle_length, latestCycle.period_length)} · ${nextStart}`
      : "Log a cycle or turn sharing on";

  // Distance summary — how far apart we are right now.
  const mine = locations?.find((l) => l.user_id === user?.id);
  const theirs = locations?.find((l) => l.user_id && l.user_id === partner?.id);
  const km = mine && theirs ? distanceKm(mine, theirs) : null;
  const distValue =
    km === null
      ? !profile?.share_location
        ? "Your sharing is off"
        : "Waiting for a location"
      : km < 0.1
        ? "You're together right now 🩷"
        : km < 1
          ? `${Math.round(km * 1000)} m apart`
          : `${km.toFixed(km < 10 ? 1 : 0)} km apart`;
  const distDetail = theirs
    ? `${partner?.display_name ?? "Partner"} updated ${timeAgo(theirs.updated_at)}`
    : "Both of you need location sharing on";

  return (
    <AppLayout title="Wellbeing" subtitle="Taking care of each other" critter="seal">
      <SectionTitle>Right now</SectionTitle>
      <div className="grid gap-3">
        <SummaryTile
          to="/cooldown"
          icon={HeartHandshake}
          tint="tile-sky"
          label="Feelings"
          value={coolValue}
          detail={coolDetail}
        />
        <div className="grid grid-cols-2 gap-3">
          <SummaryTile
            to="/period"
            icon={Droplets}
            tint="tile-peach"
            label="Cycle"
            value={cycleValue}
            detail={cycleDetail}
          />
          <SummaryTile
            to="/map"
            icon={MapPin}
            tint="tile-cream"
            label="Distance"
            value={distValue}
            detail={distDetail}
          />
        </div>
      </div>


      <SectionTitle>Care tools</SectionTitle>
      <ul className="space-y-3">
        {SECTIONS.map((s) => (
          <li key={s.to}>
            <Link
              to={s.to}
              className="card-soft press flex items-center gap-3 p-4"
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${s.tint} text-primary`}>
                <s.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{s.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </AppLayout>
  );
}
