import { Link } from "@tanstack/react-router";
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

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/wellbeing", label: "Wellbeing", icon: HeartPulse },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/nest", label: "Nest", icon: Egg },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/more", label: "More", icon: Menu },
] as const;

/**
 * Instagram-style bottom tab bar:
 * - frosted floating dock
 * - active tab gets filled tint + stronger label
 * - red notification dots
 */
export function BottomNav({ badges }: { badges?: Partial<Record<string, boolean>> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-1">
      <ul className="mx-auto grid max-w-lg grid-cols-7 gap-0.5 rounded-[1.35rem] border border-border/70 bg-card/90 p-1 shadow-float backdrop-blur-xl">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              onClick={() => playChirp("tap")}
              activeOptions={{ exact: to === "/" }}
              activeProps={{
                className: "text-primary",
              }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="press group flex flex-col items-center gap-0.5 rounded-2xl py-1.5"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "relative grid size-9 place-items-center rounded-xl transition-colors",
                      isActive && "bg-primary/12",
                    )}
                  >
                    <Icon
                      className={cn("size-[1.15rem]", isActive && "stroke-[2.4px]")}
                      fill={isActive ? "currentColor" : "none"}
                      fillOpacity={isActive ? 0.18 : 0}
                    />
                    {badges?.[to] ? (
                      <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-destructive ring-2 ring-card" />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] leading-none",
                      isActive ? "font-extrabold" : "font-semibold",
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
    </nav>
  );
}
