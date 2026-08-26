import { Link } from "@tanstack/react-router";
import {
  Home,
  CalendarDays,
  HeartPulse,
  Wallet,
  MessageCircle,
  Menu,
  Gamepad2,
} from "lucide-react";
import { playChirp } from "@/hooks/use-sound";

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/wellbeing", label: "Wellbeing", icon: HeartPulse },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/nest", label: "Our Nest", icon: Wallet },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/more", label: "More", icon: Menu },
] as const;

export function BottomNav({ badges }: { badges?: Partial<Record<string, boolean>> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2">
      <ul className="card-soft mx-auto grid max-w-lg grid-cols-7 gap-1 bg-card/90 p-1.5 shadow-float backdrop-blur">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              onClick={() => playChirp("tap")}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "tile-lilac text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="press flex flex-col items-center gap-1 rounded-2xl py-2"
            >
              <span className="relative">
                <Icon className="size-5" />
                {badges?.[to] ? (
                  <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-destructive ring-2 ring-card" />
                ) : null}
              </span>
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

