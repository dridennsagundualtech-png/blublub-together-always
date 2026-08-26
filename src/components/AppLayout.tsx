import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { Doodle, critterFor, poseFor, type Critter, type Pose } from "@/components/Doodles";
import { PairingScreen } from "@/components/CoupleGate";
import { useBadges } from "@/lib/badges";
import { useAuthUser, useCoupleId, useProfile } from "@/lib/session";
import { useLocationPublisher } from "@/lib/location";
import { useCommitmentReminders } from "@/lib/commitments";


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

  return (
    <div className="page-wash min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-lg px-4">
        <header className="card-soft lilac-gradient mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-extrabold">{title}</h1>
            {subtitle ? (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-card/80 shadow-soft">
            <Doodle
              critter={critter ?? critterFor(title)}
              pose={critterPose ?? poseFor(title)}
              size={44}
            />
          </span>

        </header>

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

        <div className="mt-4">
          {isLoading ? (
            <div className="card-soft p-5 text-sm text-muted-foreground">Loading…</div>
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
          "/budget": badges?.budget,
          "/games": badges?.games,
          "/more": badges?.question,
        }}
      />

    </div>
  );
}

