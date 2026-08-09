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
