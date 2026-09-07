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
 * Minimal bottom nav — open style, filled active icon (coffee-app energy).
 */
export function BottomNav({ badges }: { badges?: Partial<Record<string, boolean>> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/90 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1 backdrop-blur-lg">
      <ul className="mx-auto flex max-w-lg items-center justify-between">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              onClick={() => playChirp("tap")}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="press flex flex-col items-center gap-0.5 py-1.5"
            >
              {({ isActive }) => (
                <>
                  <span className="relative grid size-8 place-items-center">
                    <Icon
                      className="size-5"
                      strokeWidth={isActive ? 2.4 : 1.75}
                      fill={isActive ? "currentColor" : "none"}
                      fillOpacity={isActive ? 0.2 : 0}
                    />
                    {badges?.[to] ? (
                      <span className="absolute right-0 top-0 size-1.5 rounded-full bg-destructive" />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] leading-none",
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
    </nav>
  );
}
