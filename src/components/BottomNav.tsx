import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  CalendarDays,
  HeartPulse,
  Egg,
  MessageCircle,
  Menu,
  Gamepad2,
} from "lucide-react";
import { playChirp } from "@/hooks/use-sound";
import { cn } from "@/lib/utils";
import { MAIN_TAB_ROUTES, TAB_DIR_KEY } from "@/hooks/useSwipeTabs";

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/calendar", label: "Cal", icon: CalendarDays },
  { to: "/wellbeing", label: "Care", icon: HeartPulse },
  { to: "/games", label: "Play", icon: Gamepad2 },
  { to: "/nest", label: "Nest", icon: Egg },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/more", label: "More", icon: Menu },
] as const;

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

/**
 * Bottom nav with GymMane-style liquid pill under the active tab.
 */
export function BottomNav({ badges }: { badges?: Partial<Record<string, boolean>> }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeIdx = useMemo(() => {
    const idx = tabIndexForPath(pathname);
    return idx >= 0 ? idx : 0;
  }, [pathname]);

  const count = ITEMS.length;
  const pillWidth = 100 / count;
  const pillLeft = activeIdx * pillWidth;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/90 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1 backdrop-blur-lg">
      <div className="relative mx-auto max-w-lg">
        {/* Liquid pill */}
        <div
          className="nav-liquid-pill pointer-events-none absolute inset-y-0.5 rounded-2xl bg-primary/15 shadow-[inset_0_1px_0_color-mix(in_oklab,white_35%,transparent)]"
          style={{
            width: `calc(${pillWidth}% - 4px)`,
            left: `calc(${pillLeft}% + 2px)`,
          }}
          aria-hidden
        />

        <ul className="relative z-[1] flex items-center justify-between">
          {ITEMS.map(({ to, label, icon: Icon }, i) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                onClick={() => {
                  playChirp("tap");
                  const from = tabIndexForPath(pathname);
                  const dir = i >= from ? "left" : "right";
                  try {
                    sessionStorage.setItem(TAB_DIR_KEY, dir);
                  } catch {
                    /* ignore */
                  }
                }}
                activeOptions={{ exact: to === "/" }}
                activeProps={{ className: "text-primary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="press flex flex-col items-center gap-0.5 py-1.5"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "relative grid size-8 place-items-center transition-transform duration-300 ease-out",
                        isActive && "nav-icon-lift",
                      )}
                    >
                      <Icon
                        className="size-5"
                        strokeWidth={isActive ? 2.4 : 1.75}
                        fill={isActive ? "currentColor" : "none"}
                        fillOpacity={isActive ? 0.22 : 0}
                      />
                      {badges?.[to] ? (
                        <span className="absolute right-0 top-0 size-1.5 rounded-full bg-destructive" />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] leading-none transition-all duration-300",
                        isActive ? "font-bold" : "font-medium",
                      )}
                    >
                      {label}
                    </span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
