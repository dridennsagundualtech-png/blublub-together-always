import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

/** Main bottom-nav order — swipe left = next, swipe right = previous (Instagram-style). */
export const MAIN_TAB_ROUTES = [
  "/",
  "/calendar",
  "/wellbeing",
  "/games",
  "/nest",
  "/chat",
  "/more",
] as const;

const SWIPE_MIN_DX = 64;
const SWIPE_MAX_DY = 56;
const SWIPE_MAX_MS = 500;

function isBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        // maps & carousels
        ".leaflet-container",
        ".blublub-map-wrap",
        "[data-embla]",
        ".embla",
        // form controls
        "input",
        "textarea",
        "select",
        "[contenteditable=true]",
        // explicit opt-out
        "[data-no-page-swipe]",
        // bottom nav / sheets / dev UI
        "nav",
        "[data-dev-theme-ui]",
        "[role='dialog']",
      ].join(", "),
    ),
  );
}

function tabIndexForPath(pathname: string): number {
  // exact match first
  const exact = MAIN_TAB_ROUTES.indexOf(pathname as (typeof MAIN_TAB_ROUTES)[number]);
  if (exact >= 0) return exact;
  // nested routes under a tab (e.g. /photos under more? — only main tabs)
  // Match longest prefix among tabs except "/"
  let best = -1;
  let bestLen = 0;
  for (let i = 0; i < MAIN_TAB_ROUTES.length; i++) {
    const r = MAIN_TAB_ROUTES[i]!;
    if (r === "/") continue;
    if ((pathname === r || pathname.startsWith(`${r}/`)) && r.length > bestLen) {
      best = i;
      bestLen = r.length;
    }
  }
  // subpages like /photos, /questions aren't in MAIN_TAB_ROUTES — no swipe between subpages
  return best;
}

/**
 * Horizontal swipe between main tabs (like Instagram).
 * Does not run on maps, carousels, inputs, or when developer mode is painting boxes.
 */
export function useSwipeTabs(enabled = true) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        start.current = null;
        return;
      }
      if (isBlockedTarget(e.target)) {
        start.current = null;
        return;
      }
      // Developer mode steals taps for box editing
      if (document.documentElement.classList.contains("dev-theme-on")) {
        start.current = null;
        return;
      }
      const t = e.touches[0]!;
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const onEnd = (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || e.changedTouches.length !== 1) return;
      if (isBlockedTarget(e.target)) return;

      const t = e.changedTouches[0]!;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      const dt = Date.now() - s.t;
      if (dt > SWIPE_MAX_MS) return;
      if (Math.abs(dx) < SWIPE_MIN_DX) return;
      if (Math.abs(dy) > SWIPE_MAX_DY) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return; // need clearly horizontal

      const idx = tabIndexForPath(pathname);
      if (idx < 0) return; // not on a main tab (e.g. deep page)

      // Swipe left (finger moves left) → next tab (like IG)
      // Swipe right → previous tab
      if (dx < 0 && idx < MAIN_TAB_ROUTES.length - 1) {
        void navigate({ to: MAIN_TAB_ROUTES[idx + 1]! });
      } else if (dx > 0 && idx > 0) {
        void navigate({ to: MAIN_TAB_ROUTES[idx - 1]! });
      }
    };

    const onCancel = () => {
      start.current = null;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [enabled, navigate, pathname]);
}
