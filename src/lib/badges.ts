import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleId, useProfile } from "@/lib/session";

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Unread chat + "partner answered today's question" indicators. */
export function useBadges() {
  const coupleId = useCoupleId();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["badges", coupleId, profile?.id],
    enabled: !!coupleId && !!profile?.id,
    refetchInterval: 20_000,
    queryFn: async () => {
      const [msgs, answers] = await Promise.all([
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("couple_id", coupleId!)
          .neq("created_by", profile!.id)
          .is("read_at", null),
        supabase
          .from("question_answers")
          .select("created_by, seen_by_partner")
          .eq("couple_id", coupleId!)
          .eq("answer_date", todayISO()),
      ]);

      const rows = answers.data ?? [];
      const partnerAnswered = rows.some((r) => r.created_by !== profile!.id);
      const iAnswered = rows.some((r) => r.created_by === profile!.id);

      return {
        unreadChat: (msgs.count ?? 0) > 0,
        question: partnerAnswered && !iAnswered,
      };
    },
  });
}

/** Count of consecutive days (ending today or yesterday) present in a list of ISO dates. */
export function streakFromDates(dates: string[]) {
  const set = new Set(dates);
  const day = 86_400_000;
  const start = Date.parse(`${todayISO()}T00:00:00Z`);
  let cursor = set.has(todayISO()) ? start : start - day;
  let streak = 0;
  while (set.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= day;
  }
  return streak;
}

/** How many days in a row you've answered the daily question. */
export function useAnswerStreak() {
  const coupleId = useCoupleId();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["answer-streak", coupleId, profile?.id],
    enabled: !!coupleId && !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_answers")
        .select("answer_date")
        .eq("couple_id", coupleId!)
        .eq("created_by", profile!.id)
        .order("answer_date", { ascending: false })
        .limit(400);
      if (error) throw error;
      return streakFromDates((data ?? []).map((r) => r.answer_date));
    },
  });
}
