import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useCoupleId, useMembers, useProfile } from "@/lib/session";

export type DerivedKind = "anniversary" | "date" | "bill" | "bucket" | "cycle";

export type DerivedDate = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  kind: DerivedKind;
};

export const DERIVED_META: Record<DerivedKind, { label: string; emoji: string; dot: string }> = {
  anniversary: { label: "Anniversary", emoji: "💗", dot: "bg-pink-400" },
  date: { label: "Date night", emoji: "🌙", dot: "bg-violet-400" },
  bill: { label: "Bill due", emoji: "💸", dot: "bg-amber-400" },
  bucket: { label: "Bucket list", emoji: "🎯", dot: "bg-emerald-400" },
  cycle: { label: "Cycle", emoji: "🌸", dot: "bg-rose-400" },
};

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Everything in the app that has a date, folded into calendar-friendly rows:
 * anniversaries, planned date nights, recurring bills, bucket-list targets and
 * predicted cycle days.
 */
export function useDerivedDates() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const { data: members } = useMembers();

  return useQuery({
    queryKey: ["derived-dates", coupleId, user?.id],
    enabled: !!coupleId,
    queryFn: async (): Promise<DerivedDate[]> => {
      const [dates, bills, bucket, cycles] = await Promise.all([
        supabase.from("date_ideas").select("*").eq("couple_id", coupleId!).not("planned_for", "is", null),
        supabase.from("bills").select("*").eq("couple_id", coupleId!),
        supabase.from("bucket_list").select("*").eq("couple_id", coupleId!).not("target_date", "is", null),
        supabase.from("cycle_logs").select("*").eq("couple_id", coupleId!).order("start_date", { ascending: false }).limit(1),
      ]);

      const out: DerivedDate[] = [];
      const thisYear = new Date().getFullYear();

      // Anniversary — repeated for last/this/next year so it shows in any view.
      const anniversary = profile?.anniversary_date ?? members?.find((m) => m.anniversary_date)?.anniversary_date;
      if (anniversary) {
        const md = anniversary.slice(5);
        for (const y of [thisYear - 1, thisYear, thisYear + 1]) {
          out.push({
            id: `anniv-${y}`,
            date: `${y}-${md}`,
            title: y === new Date(`${anniversary}T00:00:00`).getFullYear() ? "The day it started 💗" : "Anniversary",
            kind: "anniversary",
          });
        }
      }

      for (const d of dates.data ?? []) {
        if (d.is_private_note && d.created_by !== user?.id) continue;
        out.push({ id: `date-${d.id}`, date: d.planned_for!, title: d.title, kind: "date" });
      }

      for (const b of bills.data ?? []) {
        const base = b.next_due_on;
        if (!base) continue;
        // Show this month's due date plus the next few months.
        for (let i = 0; i < 6; i += 1) {
          const d = new Date(`${base}T00:00:00`);
          d.setMonth(d.getMonth() + i);
          out.push({
            id: `bill-${b.id}-${i}`,
            date: d.toISOString().slice(0, 10),
            title: `${b.title} due`,
            kind: "bill",
          });
        }
      }

      for (const b of bucket.data ?? []) {
        if (b.done) continue;
        out.push({ id: `bucket-${b.id}`, date: b.target_date!, title: b.title, kind: "bucket" });
      }

      const cycle = cycles.data?.[0];
      const partner = members?.find((m) => m.id !== user?.id);
      const canSee =
        !!cycle && (cycle.user_id === user?.id || (cycle.user_id === partner?.id && !!partner?.share_cycle));
      if (cycle && canSee) {
        for (let i = 1; i <= 4; i += 1) {
          const start = addDays(cycle.start_date, cycle.cycle_length * i);
          out.push({
            id: `cycle-${i}`,
            date: start,
            title: i === 1 ? "Period expected" : "Period predicted",
            kind: "cycle",
          });
        }
      }

      return out;
    },
  });
}
