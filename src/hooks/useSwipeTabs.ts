import { useCallback, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

/** Main bottom-nav order — swipe left = next, swipe right = previous. */
export const MAIN_TAB_ROUTES = [
  "/",
  "/calendar",
  "/wellbeing",
  "/games",
  "/nest",
  "/chat",
  "/more",
] as const;

const MIN_DX = 50;
const MAX_DY = 80;

function isBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        ".leaflet-container",
        ".blublub-map-wrap",
        "[data-embla]",
        ".embla",
        "input",
        "textarea",
        "select",
        "[contenteditable=true]",
        "[data-no-page-swipe]",
        "nav",
        "[data-dev-theme-ui]",
        "[role='dialog']",
      ].join(", "),
    ),
  );
}

function tabIndexForPath(pathname: string): number {
  if (pathname === "/") return 0;
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
  return best;
}

type Start = { x: number; y: number; blocked: boolean };

/**
 * Returns touch handlers to put on the main page wrapper.
 * Swipe left → next tab, swipe right → previous tab.
 */
export function useSwipeTabs() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const startRef = useRef<Start | null>(null);

  const go = useCallback(
    (dir: -1 | 1) => {
      const idx = tabIndexForPath(pathname);
      if (idx < 0) return;
      const next = idx + dir;
      if (next < 0 || next >= MAIN_TAB_ROUTES.length) return;
      const to = MAIN_TAB_ROUTES[next]!;
      void navigate({ to });
    },
    [navigate, pathname],
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      startRef.current = null;
      return;
    }
    if (document.documentElement.classList.contains("dev-theme-on")) {
      startRef.current = null;
      return;
    }
    const t = e.touches[0]!;
    startRef.current = {
      x: t.clientX,
      y: t.clientY,
      blocked: isBlockedTarget(e.target),
    };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const s = startRef.current;
      startRef.current = null;
      if (!s || s.blocked) return;
      if (e.changedTouches.length !== 1) return;

      const t = e.changedTouches[0]!;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;

      // Need a clear horizontal swipe
      if (Math.abs(dx) < MIN_DX) return;
      if (Math.abs(dy) > MAX_DY) return;
      if (Math.abs(dx) < Math.abs(dy)) return;

      if (dx < 0) go(1); // finger moved left → next
      else go(-1); // finger moved right → previous
    },
    [go],
  );

  const onTouchCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
    // Helps the browser prefer vertical scroll but still deliver horizontal swipes
    style: { touchAction: "pan-y" } as const,
  };
}
