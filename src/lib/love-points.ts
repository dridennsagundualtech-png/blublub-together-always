import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleId } from "@/lib/session";

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Award Love Points for a small daily habit (answering the question, sharing a
 * feeling). Each kind pays out at most once per day.
 */
export function useDailyLovePoint() {
  const coupleId = useCoupleId();
  const qc = useQueryClient();

  return async (kind: string, amount = 1) => {
    if (!coupleId) return false;
    const key = `lp:${coupleId}:${kind}:${todayISO()}`;
    try {
      if (localStorage.getItem(key)) return false;
    } catch {
      /* storage unavailable — award anyway */
    }
    const { data } = await supabase
      .from("rooms")
      .select("love_points")
      .eq("couple_id", coupleId)
      .maybeSingle();
    if (!data) return false;
    const { error } = await supabase
      .from("rooms")
      .update({ love_points: data.love_points + amount })
      .eq("couple_id", coupleId);
    if (error) return false;
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    void qc.invalidateQueries({ queryKey: ["room", coupleId] });
    return true;
  };
}
