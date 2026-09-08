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
const MAX_DY = 90;

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
 * Swipe / drag between main tabs (phone touch + desktop mouse).
 * Attach the returned handlers to the page root in AppLayout.
 */
export function useSwipeTabs() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const startRef = useRef<Start | null>(null);
  const draggingRef = useRef(false);

  const go = useCallback(
    (dir: -1 | 1) => {
      const idx = tabIndexForPath(pathname);
      if (idx < 0) return;
      const next = idx + dir;
      if (next < 0 || next >= MAIN_TAB_ROUTES.length) return;
      void navigate({ to: MAIN_TAB_ROUTES[next]! });
    },
    [navigate, pathname],
  );

  const begin = useCallback((x: number, y: number, target: EventTarget | null) => {
    if (document.documentElement.classList.contains("dev-theme-on")) {
      startRef.current = null;
      return;
    }
    startRef.current = {
      x,
      y,
      blocked: isBlockedTarget(target),
    };
  }, []);

  const finish = useCallback(
    (x: number, y: number) => {
      const s = startRef.current;
      startRef.current = null;
      draggingRef.current = false;
      if (!s || s.blocked) return;

      const dx = x - s.x;
      const dy = y - s.y;

      if (Math.abs(dx) < MIN_DX) return;
      if (Math.abs(dy) > MAX_DY) return;
      if (Math.abs(dx) < Math.abs(dy)) return;

      if (dx < 0) go(1);
      else go(-1);
    },
    [go],
  );

  // —— Touch (phone) ——
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) {
        startRef.current = null;
        return;
      }
      const t = e.touches[0]!;
      begin(t.clientX, t.clientY, e.target);
    },
    [begin],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.changedTouches.length !== 1) {
        startRef.current = null;
        return;
      }
      const t = e.changedTouches[0]!;
      finish(t.clientX, t.clientY);
    },
    [finish],
  );

  const onTouchCancel = useCallback(() => {
    startRef.current = null;
    draggingRef.current = false;
  }, []);

  // —— Mouse (desktop) ——
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      begin(e.clientX, e.clientY, e.target);
      draggingRef.current = true;
    },
    [begin],
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingRef.current && !startRef.current) return;
      finish(e.clientX, e.clientY);
    },
    [finish],
  );

  const onMouseLeave = useCallback(() => {
    // Cancel if pointer leaves the page area without release
    startRef.current = null;
    draggingRef.current = false;
  }, []);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    style: { touchAction: "pan-y", userSelect: "none" } as const,
  };
}
