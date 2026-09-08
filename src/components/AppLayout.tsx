import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { Doodle, critterFor, poseFor, type Critter, type Pose } from "@/components/Doodles";
import { PairingScreen } from "@/components/CoupleGate";
import { useBadges } from "@/lib/badges";
import { useAuthUser, useCouple, useCoupleId, useProfile } from "@/lib/session";
import { useLocationPublisher } from "@/lib/location";
import { useCommitmentReminders } from "@/lib/commitments";
import { applyColors, normalizeTheme, stampAndApplyBoxOverrides, THEME_STORAGE_KEY as STORAGE_KEY } from "@/lib/theme";
import { DevThemeHost } from "@/components/DevThemeHost";

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
      applyColors(next, pathname);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      requestAnimationFrame(() => stampAndApplyBoxOverrides(next, pathname));
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const next = normalizeTheme(JSON.parse(raw));
        applyColors(next, pathname);
        requestAnimationFrame(() => stampAndApplyBoxOverrides(next, pathname));
      }
    } catch {
      // ignore
    }
  }, [couple, pathname]);


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

      <DevThemeHost />

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
