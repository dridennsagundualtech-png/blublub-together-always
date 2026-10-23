import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { ChatHead } from "@/components/ChatHead";
import { SideMenu } from "@/components/SideMenu";
import { MAIN_TAB_ROUTES, useSwipeTabs } from "@/hooks/useSwipeTabs";
import { useBadges } from "@/lib/badges";
import { useCommitmentReminders } from "@/lib/commitments";
import { useLocationPublisher } from "@/lib/location";
import { SideMenuContext } from "@/lib/side-menu";

/**
 * The app is browsable signed out — signing in happens inside Profile & Settings.
 * Data still requires a session (RLS), so signed-out pages simply render empty.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: SignedInLayout,
});

/** Every screen, plus what floats over all of them: the chat head and the side bar (More). */
function SignedInLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  return (
    <SideMenuContext.Provider value={openMenu}>
      <Shell />
      <ChatHead />
      <SideMenu open={menuOpen} onClose={closeMenu} />
    </SideMenuContext.Provider>
  );
}

/**
 * What stays on screen while you move between pages: the style's background, the tab bar, swiping
 * and the app-wide helpers (location sharing, reminders). Each page used to build its own copy,
 * so every page change rebuilt all of it — slow with the heavier styles, the tab pill couldn't
 * glide, and location sharing asked the phone for a fresh position on every page.
 */
function Shell() {
  const router = useRouter();
  const { data: badges } = useBadges();
  const swipe = useSwipeTabs();
  useLocationPublisher();
  useCommitmentReminders();

  // Fetch the tab pages' code once the app has settled, so the first visit to a tab doesn't wait.
  useEffect(() => {
    const t = window.setTimeout(() => {
      for (const to of MAIN_TAB_ROUTES) void router.preloadRoute({ to }).catch(() => {});
    }, 1500);
    return () => window.clearTimeout(t);
  }, [router]);

  return (
    <div
      className="page-wash min-h-screen bg-background pb-28"
      style={swipe.style}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
      onTouchCancel={swipe.onTouchCancel}
      onMouseDown={swipe.onMouseDown}
      onMouseUp={swipe.onMouseUp}
      onMouseLeave={swipe.onMouseLeave}
    >
      <Outlet />
      <BottomNav
        badges={{
          "/calendar": badges?.calendar,
          "/nest": badges?.budget,
          "/games": badges?.games,
        }}
      />
    </div>
  );
}
