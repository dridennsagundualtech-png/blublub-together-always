import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuthUser, useCoupleId, usePartner, useProfile } from "@/lib/session";
import { todayISO } from "@/lib/badges";

export type Commitment = Tables<"commitments">;
export type CommitmentLog = Tables<"commitment_logs">;

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function isoOf(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

/** Monday-based start of the week containing `iso`. */
export function weekStartISO(iso = todayISO()) {
  const d = new Date(`${iso}T00:00:00`);
  const shift = (d.getDay() + 6) % 7;
  return addDaysISO(iso, -shift);
}

export function weekDatesISO(iso = todayISO()) {
  const start = weekStartISO(iso);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
}

export function dowOf(iso: string) {
  return new Date(`${iso}T00:00:00`).getDay();
}

/** Is this commitment expected on that date? Weekly-count goals accept any day. */
export function isDueOn(c: Commitment, iso: string) {
  if (c.schedule_type === "weekday") return dowOf(iso) === (c.weekday ?? 0);
  return true;
}

export function scheduleLabel(c: Commitment) {
  if (c.schedule_type === "weekday") return `Every ${WEEKDAYS[c.weekday ?? 0]}`;
  if (c.schedule_type === "weekly_count") return `${c.weekly_target ?? 3}× a week`;
  return "Every day";
}

export function prettyTime(t: string) {
  const [h = "0", m = "00"] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${suffix}`;
}

export function doneDates(logs: CommitmentLog[], commitmentId: string) {
  return new Set(logs.filter((l) => l.commitment_id === commitmentId).map((l) => l.log_date));
}

export function weekCount(logs: CommitmentLog[], c: Commitment) {
  const done = doneDates(logs, c.id);
  return weekDatesISO().filter((d) => done.has(d)).length;
}

export function weekTarget(c: Commitment) {
  if (c.schedule_type === "weekly_count") return Math.max(1, c.weekly_target ?? 3);
  if (c.schedule_type === "weekday") return 1;
  return 7;
}

/**
 * Encouraging streak: consecutive expected days that were checked off.
 * Today not being done yet never breaks the streak.
 */
export function streakFor(logs: CommitmentLog[], c: Commitment) {
  const done = doneDates(logs, c.id);
  if (c.schedule_type === "weekly_count") {
    let streak = 0;
    for (let w = 0; w < 52; w++) {
      const dates = weekDatesISO(addDaysISO(weekStartISO(), -7 * w));
      const hit = dates.filter((d) => done.has(d)).length;
      if (hit >= weekTarget(c)) streak++;
      else if (w > 0) break;
      else if (hit === 0) break;
      else break;
    }
    return streak;
  }
  let streak = 0;
  let cursor = todayISO();
  for (let i = 0; i < 400; i++) {
    if (isDueOn(c, cursor)) {
      if (done.has(cursor)) streak++;
      else if (cursor !== todayISO()) break;
    }
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function useCommitments() {
  const coupleId = useCoupleId();
  return useQuery({
    queryKey: ["commitments", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitments")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Commitment[];
    },
  });
}

export function useCommitmentLogs() {
  const coupleId = useCoupleId();
  return useQuery({
    queryKey: ["commitment-logs", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitment_logs")
        .select("*")
        .eq("couple_id", coupleId!)
        .gte("log_date", addDaysISO(todayISO(), -370));
      if (error) throw error;
      return (data ?? []) as CommitmentLog[];
    },
  });
}

function canNotify() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

function notifyOncePerDay(key: string, title: string, body: string) {
  if (!canNotify()) return;
  const stamp = `${todayISO()}:${key}`;
  try {
    if (window.localStorage.getItem(`blublub:commit-notif:${key}`) === stamp) return;
    window.localStorage.setItem(`blublub:commit-notif:${key}`, stamp);
  } catch {
    /* storage unavailable — may repeat, acceptable */
  }
  new Notification(title, { body, icon: "/favicon.ico" });
}

function pastReminder(c: Commitment) {
  const [h = "0", m = "0"] = c.reminder_time.split(":");
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= Number(h) * 60 + Number(m);
}

/**
 * Local reminders for your own commitments plus light, real-time partner
 * encouragement for the ones they chose to share. No history is surfaced.
 */
export function useCommitmentReminders() {
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const partner = usePartner();
  const coupleId = useCoupleId();
  const { data: commitments } = useCommitments();
  const { data: logs } = useCommitmentLogs();
  const qc = useQueryClient();

  // My reminder times + gentle partner nudges after their reminder time.
  useEffect(() => {
    if (!user?.id || !commitments || !logs) return;
    const check = () => {
      const today = todayISO();
      for (const c of commitments) {
        if (!c.active || !isDueOn(c, today)) continue;
        const done = doneDates(logs, c.id).has(today);
        if (done || !pastReminder(c)) continue;
        if (c.user_id === user.id) {
          notifyOncePerDay(`mine:${c.id}`, "Gentle reminder 🩷", `Time for “${c.title}”.`);
        } else if (c.shared) {
          notifyOncePerDay(
            `partner:${c.id}`,
            "A little nudge 💛",
            `${partner?.display_name ?? "Your partner"} hasn't checked off “${c.title}” yet — send some encouragement?`,
          );
        }
      }
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [user?.id, commitments, logs, partner?.display_name]);

  // Celebrate the moment they check something off.
  useEffect(() => {
    if (!coupleId || !user?.id) return;
    const channel = supabase
      .channel(`commitment-logs-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "commitment_logs", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const row = payload.new as CommitmentLog;
          void qc.invalidateQueries({ queryKey: ["commitment-logs"] });
          if (row.user_id === user.id) return;
          const c = commitments?.find((x) => x.id === row.commitment_id);
          if (!c?.shared || !canNotify()) return;
          new Notification("Way to go! 🎉", {
            body: `${partner?.display_name ?? "Your partner"} completed their “${c.title}” commitment!`,
            icon: "/favicon.ico",
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, user?.id, commitments, partner?.display_name, qc, profile?.id]);
}
