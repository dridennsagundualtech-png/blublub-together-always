import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Doodle, poseFor, type Critter, type Pose } from "@/components/Doodles";
import { PairingScreen } from "@/components/CoupleGate";
import { useBadges } from "@/lib/badges";
import { useCoupleId, useProfile } from "@/lib/session";

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
  const coupleId = useCoupleId();
  const { data: badges } = useBadges();

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
          {critter ? (
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-card/80 shadow-soft">
              <Doodle critter={critter} pose={critterPose ?? poseFor(title)} size={44} />
            </span>
          ) : null}
        </header>

        <div className="mt-4">
          {isLoading ? (
            <div className="card-soft p-5 text-sm text-muted-foreground">Loading…</div>
          ) : requireCouple && !coupleId ? (
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

