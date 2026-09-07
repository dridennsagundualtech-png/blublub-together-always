import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { Doodle, critterFor, poseFor, type Critter, type Pose } from "@/components/Doodles";
import { PairingScreen } from "@/components/CoupleGate";
import { useBadges } from "@/lib/badges";
import { useAuthUser, useCouple, useCoupleId, useProfile } from "@/lib/session";
import { useLocationPublisher } from "@/lib/location";
import { useCommitmentReminders } from "@/lib/commitments";

const STORAGE_KEY = "blublub-theme-v2";

const DEFAULTS = {
  main: "#FFAFCC",
  soft: "#FFC8DD",
  purple: "#CDB4DB",
  blue: "#A2D2FF",
  gradFrom: "#CDB4DB",
  gradTo: "#FFAFCC",
  boxesGradient: false,
  boxGradFrom: "#FFFFFF",
  boxGradTo: "#FFC8DD",
};

function applyColors(map: typeof DEFAULTS) {
  const root = document.documentElement;
  root.style.setProperty("--primary", map.main);
  root.style.setProperty("--ring", map.main);
  root.style.setProperty("--sidebar-primary", map.main);
  root.style.setProperty("--chart-1", map.main);

  root.style.setProperty("--petal", map.soft);
  root.style.setProperty("--peach", map.soft);
  root.style.setProperty("--secondary", map.soft);
  root.style.setProperty("--chart-5", map.soft);

  root.style.setProperty("--accent", map.purple);
  root.style.setProperty("--lavender", map.purple);
  root.style.setProperty("--sidebar-accent", map.purple);
  root.style.setProperty("--chart-2", map.purple);

  root.style.setProperty("--sky", map.blue);
  root.style.setProperty("--icy", map.blue === "#A2D2FF" ? "#BDE0FE" : map.blue);
  root.style.setProperty("--chart-3", map.blue);
  root.style.setProperty("--chart-4", map.blue === "#A2D2FF" ? "#BDE0FE" : map.blue);

  root.style.setProperty("--grad-featured-from", map.gradFrom);
  root.style.setProperty("--grad-featured-to", map.gradTo);
  root.style.setProperty("--grad-hero-from", map.gradFrom);
  root.style.setProperty("--grad-hero-to", map.gradTo);
  root.style.setProperty("--grad-panel-from", map.gradFrom);
  root.style.setProperty("--grad-panel-to", map.gradTo);

  root.style.setProperty("--box-grad-from", map.boxGradFrom || map.soft);
  root.style.setProperty("--box-grad-to", map.boxGradTo || map.main);
  document.documentElement.classList.toggle("boxes-gradient", !!map.boxesGradient);
}

function normalizeTheme(raw: unknown): typeof DEFAULTS {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  const o = raw as Record<string, unknown>;
  if (typeof o.main === "string") {
    return {
      main: (o.main as string) || DEFAULTS.main,
      soft: (o.soft as string) || DEFAULTS.soft,
      purple: (o.purple as string) || DEFAULTS.purple,
      blue: (o.blue as string) || DEFAULTS.blue,
      gradFrom: (o.gradFrom as string) || (o.purple as string) || DEFAULTS.gradFrom,
      gradTo: (o.gradTo as string) || (o.main as string) || DEFAULTS.gradTo,
      boxesGradient: !!o.boxesGradient,
      boxGradFrom: (o.boxGradFrom as string) || DEFAULTS.soft,
      boxGradTo: (o.boxGradTo as string) || DEFAULTS.main,
    };
  }
  return { ...DEFAULTS };
}

export function AppLayout({
  title,
  subtitle,
  critter,
  critterPose,
  requireCouple = true,
  children,
}: {
  title: string;
  subtitle?: string;
  critter?: Critter;
  critterPose?: Pose;
  requireCouple?: boolean;
  children: ReactNode;
}) {
  const { isLoading } = useProfile();
  const { data: user } = useAuthUser();
  const coupleId = useCoupleId();
  const { data: couple } = useCouple();
  const { data: badges } = useBadges();
  useLocationPublisher();
  useCommitmentReminders();

  useEffect(() => {
    const fromCouple = (couple as { theme?: unknown } | null | undefined)?.theme;
    if (fromCouple) {
      const next = normalizeTheme(fromCouple);
      applyColors(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) applyColors(normalizeTheme(JSON.parse(raw)));
    } catch {
      // ignore
    }
  }, [couple]);

  return (
    <div className="page-wash min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[1.35rem] font-extrabold tracking-tight">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10">
            <Doodle
              critter={critter ?? critterFor(title)}
              pose={critterPose ?? poseFor(title)}
              size={34}
            />
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-5">
        {!user ? (
          <Link
            to="/profile"
            className="surface-quiet press mt-2 flex items-center justify-between gap-3 px-4 py-3"
          >
            <span className="text-xs text-muted-foreground">
              You&apos;re browsing signed out — your data won&apos;t load.
            </span>
            <span className="shrink-0 text-xs font-bold text-primary">Sign in</span>
          </Link>
        ) : null}

        <div className="mt-2">
          {isLoading ? (
            <div className="space-y-3 py-6">
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
              <div className="h-28 w-full animate-pulse rounded-3xl bg-muted" />
            </div>
          ) : user && requireCouple && !coupleId ? (
            <PairingScreen />
          ) : (
            children
          )}
        </div>
      </div>

      <BottomNav
        badges={{
          "/chat": badges?.unreadChat,
          "/calendar": badges?.calendar,
          "/nest": badges?.budget,
          "/games": badges?.games,
          "/more": badges?.question,
        }}
      />
    </div>
  );
}
