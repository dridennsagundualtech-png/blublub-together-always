import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  BookHeart,
  CalendarDays,
  Droplets,
  Gamepad2,
  HeartHandshake,
  Images,
  ListChecks,
  MessageCircle,
  Palette,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import {
  type AppNotification,
  type NotifKind,
  useAppNotifications,
  useMarkNotificationsSeen,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

function iconFor(kind: NotifKind) {
  switch (kind) {
    case "message":
      return MessageCircle;
    case "photo":
    case "album":
      return Images;
    case "question":
      return Sparkles;
    case "feeling":
    case "cooldown":
      return HeartHandshake;
    case "cycle":
      return Droplets;
    case "diary":
      return BookHeart;
    case "todo":
      return ListChecks;
    case "bucket":
      return Target;
    case "expense":
      return Wallet;
    case "game":
      return Gamepad2;
    case "settings":
      return Palette;
    case "calendar":
      return CalendarDays;
    default:
      return Bell;
  }
}

function timeLabel(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString();
}

function NotifRow({ n, onNavigate }: { n: AppNotification; onNavigate: () => void }) {
  const Icon = iconFor(n.kind);
  return (
    <Link
      to={n.href}
      onClick={onNavigate}
      className="press flex gap-3 rounded-2xl bg-muted/50 p-3 text-left"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-bold leading-snug">{n.title}</span>
          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
            {timeLabel(n.at)}
          </span>
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{n.body}</span>
      </span>
    </Link>
  );
}

export function NotificationBell({ className }: { className?: string }) {
  const { data } = useAppNotifications();
  const markSeen = useMarkNotificationsSeen();
  const [open, setOpen] = useState(false);

  const count = data?.unseenCount ?? 0;
  const items = data?.items ?? [];

  function openPanel() {
    setOpen(true);
    markSeen();
  }

  return (
    <>
      <button
        type="button"
        aria-label={count > 0 ? `${count} notifications` : "Notifications"}
        onClick={openPanel}
        className={cn(
          "press relative grid size-11 place-items-center rounded-full bg-card shadow-soft",
          className,
        )}
      >
        <Bell className="size-5 text-foreground" />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.15rem] place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close notifications"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-3xl bg-card shadow-float sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="font-display text-lg font-bold">Updates</p>
                <p className="text-[11px] text-muted-foreground">
                  Everything new across your space
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="press grid size-9 place-items-center rounded-full bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-3 py-3">
              {items.length === 0 ? (
                <div className="px-2 py-10 text-center">
                  <Bell className="mx-auto size-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-semibold text-muted-foreground">
                    You’re all caught up
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    New posts, messages, feelings, and nest updates will show here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2 pb-4">
                  {items.map((n) => (
                    <li key={n.id}>
                      <NotifRow n={n} onNavigate={() => setOpen(false)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
