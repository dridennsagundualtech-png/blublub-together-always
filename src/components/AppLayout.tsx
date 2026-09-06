import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { Doodle, critterFor, poseFor, type Critter, type Pose } from "@/components/Doodles";
import { PairingScreen } from "@/components/CoupleGate";
import { useBadges } from "@/lib/badges";
import { useAuthUser, useCoupleId, useProfile } from "@/lib/session";
import { useLocationPublisher } from "@/lib/location";
import { useCommitmentReminders } from "@/lib/commitments";

/**
 * App shell — Instagram-inspired sticky header + content column.
 * Soft BLUBLUB branding kept (critter, lilac header, cozy wash).
 */
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
  const { data: badges } = useBadges();
  useLocationPublisher();
  useCommitmentReminders();

  return (
    <div className="page-wash min-h-screen bg-background pb-28">
      {/* Sticky top bar — IG-style clean header that stays while scrolling */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-extrabold tracking-tight">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 ring-1 ring-border shadow-soft">
            <Doodle
              critter={critter ?? critterFor(title)}
              pose={critterPose ?? poseFor(title)}
              size={36}
            />
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {!user ? (
          <Link
            to="/profile"
            className="card-soft press mt-3 flex items-center justify-between gap-3 px-4 py-3"
          >
            <span className="text-xs text-muted-foreground">
              You&apos;re browsing signed out — your data won&apos;t load.
            </span>
            <span className="shrink-0 text-xs font-bold text-primary">Sign in</span>
          </Link>
        ) : null}

        <div className="mt-3">
          {isLoading ? (
            <div className="card-soft space-y-3 p-5">
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
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
