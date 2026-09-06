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
  { to: "/calendar", label: "Cal", icon: CalendarDays },
  { to: "/wellbeing", label: "Care", icon: HeartPulse },
  { to: "/games", label: "Play", icon: Gamepad2 },
  { to: "/nest", label: "Nest", icon: Egg },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/more", label: "More", icon: Menu },
] as const;

/**
 * Floating white pill nav (mockup-style).
 * Active tab: filled soft pink circle + bold label.
 */
export function BottomNav({ badges }: { badges?: Partial<Record<string, boolean>> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-1">
      <ul className="mx-auto flex max-w-lg items-center justify-between gap-0.5 rounded-full border border-border/50 bg-card/95 px-1.5 py-1.5 shadow-float backdrop-blur-xl">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              onClick={() => playChirp("tap")}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="press flex flex-col items-center gap-0.5 rounded-full py-1"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "relative grid size-9 place-items-center rounded-full transition-all",
                      isActive && "bg-primary text-primary-foreground shadow-soft",
                    )}
                  >
                    <Icon
                      className="size-[1.1rem]"
                      strokeWidth={isActive ? 2.4 : 2}
                      fill={isActive ? "currentColor" : "none"}
                      fillOpacity={isActive ? 0.2 : 0}
                    />
                    {badges?.[to] ? (
                      <span
                        className={cn(
                          "absolute right-0.5 top-0.5 size-2 rounded-full bg-destructive ring-2",
                          isActive ? "ring-primary" : "ring-card",
                        )}
                      />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] leading-none",
                      isActive ? "font-extrabold text-primary" : "font-semibold",
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
