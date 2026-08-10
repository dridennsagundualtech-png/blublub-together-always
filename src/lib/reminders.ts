import { useEffect } from "react";
import { daysTogether, useMembers, useProfile } from "@/lib/session";

const KEY = "blublub:anniversary-notified";

export function canNotify() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function askNotificationPermission() {
  if (!canNotify()) return "unsupported" as const;
  return Notification.requestPermission();
}

function fire(title: string, body: string) {
  if (!canNotify() || Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/favicon.ico" });
}

/** Days until the next yearly recurrence of the anniversary. */
export function daysUntilAnniversary(anniversary: string | null | undefined): number | null {
  if (!anniversary) return null;
  const base = new Date(`${anniversary}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const next = new Date(now.getFullYear(), base.getMonth(), base.getDate());
  if (next < now) next.setFullYear(next.getFullYear() + 1);
  return Math.round((next.getTime() - now.getTime()) / 86_400_000);
}

/**
 * Nudges the couple as the anniversary approaches. Fires at most once per day
 * per milestone while the app is open (no background push yet).
 */
export function useAnniversaryReminder() {
  const { data: profile } = useProfile();
  const { data: members } = useMembers();

  const anniversary =
    members?.map((m) => m.anniversary_date).filter(Boolean).sort()[0] ??
    profile?.anniversary_date ??
    null;

  useEffect(() => {
    if (!anniversary || !canNotify() || Notification.permission !== "granted") return;
    const left = daysUntilAnniversary(anniversary);
    if (left === null) return;
    const milestone = [0, 1, 3, 7, 30].find((d) => d === left);
    if (milestone === undefined) return;
    const stamp = `${new Date().toDateString()}:${milestone}`;
    if (window.localStorage.getItem(KEY) === stamp) return;
    window.localStorage.setItem(KEY, stamp);
    fire(
      milestone === 0 ? "Happy anniversary! 🩷" : "Anniversary coming up",
      milestone === 0
        ? `${daysTogether(anniversary) ?? 0} days together today.`
        : `Only ${milestone} day${milestone === 1 ? "" : "s"} to go — plan something sweet.`,
    );
  }, [anniversary]);
}
