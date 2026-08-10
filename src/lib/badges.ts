import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleId, useProfile } from "@/lib/session";

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Sections that track a "last viewed" timestamp per user. */
export type SeenKey = "diary" | "calendar" | "budget" | "games" | "questions";

function seenStorageKey(userId: string, key: SeenKey) {
  return `blublub:seen:${userId}:${key}`;
}

export function readSeenAt(userId: string, key: SeenKey): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(seenStorageKey(userId, key));
  } catch {
    return null;
  }
}

export function writeSeenAt(userId: string, key: SeenKey) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(seenStorageKey(userId, key), new Date().toISOString());
  } catch {
    /* storage unavailable — badge just stays until next load */
  }
}

/** True when the partner's newest activity is newer than the last time you looked. */
function isNew(latest: string | null | undefined, seenAt: string | null) {
  if (!latest) return false;
  if (!seenAt) return true;
  return Date.parse(latest) > Date.parse(seenAt);
}

async function latestPartnerAt(
  table: "diary_entries" | "events" | "expenses",
  coupleId: string,
  myId: string,
) {
  const { data } = await supabase
    .from(table)
    .select("created_at")
    .eq("couple_id", coupleId)
    .neq("created_by", myId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.created_at ?? null;
}

/** Unseen-activity indicators for the bottom nav and section tiles. */
export function useBadges() {
  const coupleId = useCoupleId();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["badges", coupleId, profile?.id],
    enabled: !!coupleId && !!profile?.id,
    refetchInterval: 20_000,
    queryFn: async () => {
      const myId = profile!.id;
      const [msgs, answers, diaryAt, eventAt, expenseAt, games] = await Promise.all([
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .is("read_at", null),
        supabase
          .from("question_answers")
          .select("created_by, seen_by_partner")
          .eq("couple_id", coupleId!)
          .eq("answer_date", todayISO()),
        latestPartnerAt("diary_entries", coupleId!, myId),
        latestPartnerAt("events", coupleId!, myId),
        latestPartnerAt("expenses", coupleId!, myId),
        supabase
          .from("games")
          .select("status, turn, finished_at, created_by")
          .eq("couple_id", coupleId!)
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);

      const rows = answers.data ?? [];
      const partnerAnswered = rows.some((r) => r.created_by !== myId);
      const iAnswered = rows.some((r) => r.created_by === myId);

      const gameRows = games.data ?? [];
      const gamesSeenAt = readSeenAt(myId, "games");
      const myTurn = gameRows.some((g) => g.status === "playing" && g.turn === myId);
      const newlyFinished = gameRows.some(
        (g) => g.status === "done" && g.created_by !== myId && isNew(g.finished_at, gamesSeenAt),
      );

      const questionSeenAt = readSeenAt(myId, "questions");
      const questionRevealPending =
        partnerAnswered && !isNew(null, questionSeenAt) === false
          ? partnerAnswered && (!questionSeenAt || questionSeenAt.slice(0, 10) !== todayISO())
          : false;

      return {
        unreadChat: (msgs.count ?? 0) > 0,
        // Partner replied today and you haven't opened the question screen since.
        question: (partnerAnswered && !iAnswered) || questionRevealPending,
        diary: isNew(diaryAt, readSeenAt(myId, "diary")),
        calendar: isNew(eventAt, readSeenAt(myId, "calendar")),
        budget: isNew(expenseAt, readSeenAt(myId, "budget")),
        games: myTurn || newlyFinished,
      };
    },
  });
}

/** Marks a section as viewed (clears its red dot) when the page mounts. */
export function useMarkSeen(key: SeenKey) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const userId = profile?.id;

  useEffect(() => {
    if (!userId) return;
    writeSeenAt(userId, key);
    void qc.invalidateQueries({ queryKey: ["badges"] });
  }, [userId, key, qc]);
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
