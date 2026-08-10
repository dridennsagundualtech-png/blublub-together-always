import { Link } from "@tanstack/react-router";
import {
  Home,
  CalendarDays,
  BookHeart,
  Wallet,
  MessageCircle,
  Menu,
  Gamepad2,
} from "lucide-react";
import { playChirp } from "@/hooks/use-sound";

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/diary", label: "Diary", icon: BookHeart },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/budget", label: "Budget", icon: Wallet },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/more", label: "More", icon: Menu },
] as const;

export function BottomNav({ badges }: { badges?: Partial<Record<string, boolean>> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-7">

        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              onClick={() => playChirp("tap")}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="press flex flex-col items-center gap-1 py-2.5"
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
