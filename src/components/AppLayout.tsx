import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Doodle, type Critter } from "@/components/Doodles";
import { PairingScreen } from "@/components/CoupleGate";
import { useBadges } from "@/lib/badges";
import { useCoupleId, useProfile } from "@/lib/session";

export function AppLayout({
  title,
  subtitle,
  critter,
  requireCouple = true,
  children,
}: {
  title: string;
  subtitle?: string;
  critter?: Critter;
  requireCouple?: boolean;
  children: ReactNode;
}) {
  const { isLoading } = useProfile();
  const coupleId = useCoupleId();
  const { data: badges } = useBadges();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-lg px-4">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pb-4 pt-6">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold">{title}</h1>
            {subtitle ? (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {critter ? <Doodle critter={critter} size={52} className="shrink-0" /> : null}
        </header>
        {isLoading ? (
          <div className="card-soft p-5 text-sm text-muted-foreground">Loading…</div>
        ) : requireCouple && !coupleId ? (
          <PairingScreen />
        ) : (
          children
        )}
      </div>
      <BottomNav badges={{ "/chat": badges?.unreadChat }} />
    </div>
  );
}
