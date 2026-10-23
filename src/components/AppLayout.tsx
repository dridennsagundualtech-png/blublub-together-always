import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Doodle, critterFor, poseFor, type Critter, type Pose } from "@/components/Doodles";
import { PairingScreen } from "@/components/CoupleGate";
import { useBadges } from "@/lib/badges";
import { useAuthUser, useCouple, useCoupleId, useProfile } from "@/lib/session";
import {
  applyColors,
  normalizeTheme,
  stampAndApplyBoxOverrides,
  THEME_STORAGE_KEY as STORAGE_KEY,
} from "@/lib/theme";
import { DevThemeHost } from "@/components/DevThemeHost";
import { Menu } from "lucide-react";
import { useOpenSideMenu } from "@/lib/side-menu";
import { TAB_DIR_KEY } from "@/hooks/useSwipeTabs";

/** Which way the page slides in (set by a tab tap or swipe), read once per page change. */
function takeSlideClass() {
  let dir = "left";
  try {
    dir = sessionStorage.getItem(TAB_DIR_KEY) || "left";
    sessionStorage.removeItem(TAB_DIR_KEY);
  } catch {
    /* ignore */
  }
  return dir === "right" ? "page-gym-from-left" : "page-gym-from-right";
}

/**
 * One page: its header and content. The background, tab bar and swipe live in the signed-in
 * layout (routes/_authenticated/route.tsx) so they stay put while pages change.
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isLoading } = useProfile();
  const { data: user } = useAuthUser();
  const coupleId = useCoupleId();
  const { data: couple } = useCouple();
  const { data: badges } = useBadges();
  const openMenu = useOpenSideMenu();
  // Starts with the slide class so the page's very first frame is already animating
  // (setting it in an effect showed the page once, then hid it and slid it in).
  const [slideClass, setSlideClass] = useState(takeSlideClass);
  const firstPath = useRef(true);

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

  // Page slide animation when route changes (from swipe or tab); the class comes off afterwards
  // so the next change on the same page (e.g. another game) can slide again.
  useEffect(() => {
    if (firstPath.current) firstPath.current = false;
    else setSlideClass(takeSlideClass());
    const t = window.setTimeout(() => setSlideClass(""), 420);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[1.35rem] font-extrabold tracking-tight">
              {title}
            </h1>
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          {/* The critter opens the side bar (More); the dot means something in there is new. */}
          <button
            type="button"
            onClick={openMenu}
            aria-label={badges?.question ? "Open menu, something new" : "Open menu"}
            className="press relative grid size-10 shrink-0 place-items-center rounded-full"
            style={{ background: "color-mix(in oklab, var(--color-primary) 10%, transparent)" }}
          >
            <span className="grid size-10 place-items-center overflow-hidden rounded-full">
              <Doodle
                critter={critter ?? critterFor(title)}
                pose={critterPose ?? poseFor(title)}
                size={34}
              />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-card text-foreground shadow-soft">
              <Menu className="size-2.5" strokeWidth={3} />
            </span>
            {badges?.question ? (
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive" />
            ) : null}
          </button>
        </div>
      </header>

      <div className={`page-transition-root mx-auto max-w-lg px-5 ${slideClass}`}>
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
    </>
  );
}
