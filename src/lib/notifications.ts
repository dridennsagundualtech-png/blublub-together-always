import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/badges";
import { useAuthUser, useCoupleId, usePartner, useProfile } from "@/lib/session";

export type NotifKind =
  | "message"
  | "photo"
  | "album"
  | "question"
  | "feeling"
  | "cycle"
  | "diary"
  | "todo"
  | "bucket"
  | "expense"
  | "game"
  | "settings"
  | "calendar"
  | "cooldown";

export type AppNotification = {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  href: string;
  at: string; // ISO timestamp
};

const SEEN_KEY = "blublub:notif-seen-at";

export function readNotifSeenAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function writeNotifSeenAt(iso?: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_KEY, iso ?? new Date().toISOString());
  } catch {
    /* ignore */
  }
}

function phaseInfo(start: string, cycleLength: number, periodLength: number) {
  const day =
    Math.floor(
      (Date.parse(`${todayISO()}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / 86_400_000,
    ) % cycleLength;
  if (day < 0) return null;

  if (day < periodLength) {
    return {
      name: "Period",
      meaning:
        "Menstrual phase — the body is shedding the uterine lining. Energy is often lower; rest and gentleness help.",
    };
  }
  if (day < cycleLength / 2 - 2) {
    return {
      name: "Follicular",
      meaning:
        "Follicular phase — after the period, estrogen rises and energy often builds. A good time for plans and new ideas.",
    };
  }
  if (day <= cycleLength / 2 + 1) {
    return {
      name: "Ovulation",
      meaning:
        "Ovulation — the fertile window. Many people feel more social and energetic; communication can feel extra open.",
    };
  }
  return {
    name: "Luteal",
    meaning:
      "Luteal phase — after ovulation, progesterone rises. Mood can feel more sensitive or tired; extra care and patience go a long way.",
  };
}

function isAfter(iso: string | null | undefined, seenAt: string | null) {
  if (!iso) return false;
  if (!seenAt) return true;
  return Date.parse(iso) > Date.parse(seenAt);
}

/** Aggregates partner activity into a notification list for the home bell. */
export function useAppNotifications() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const partner = usePartner();
  const partnerName = partner?.display_name ?? "Partner";

  return useQuery({
    queryKey: ["app-notifications", coupleId, user?.id],
    enabled: !!coupleId && !!user?.id,
    refetchInterval: 25_000,
    queryFn: async () => {
      const myId = user!.id;
      const seenAt = readNotifSeenAt();
      const items: AppNotification[] = [];

      const [
        msgs,
        photos,
        answers,
        feelings,
        cycles,
        diary,
        todos,
        bucket,
        expenses,
        games,
        events,
        couple,
      ] = await Promise.all([
        supabase
          .from("messages")
          .select("id, body, created_at, created_by, read_at")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("photos")
          .select("id, caption, album, storage_path, created_at, created_by, body")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("question_answers")
          .select("created_by, created_at, seen_by_partner")
          .eq("couple_id", coupleId!)
          .eq("answer_date", todayISO()),
        supabase
          .from("cooldowns")
          .select("id, feeling, need, shared, created_at, created_by")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("cycle_logs")
          .select("id, start_date, cycle_length, period_length, user_id, updated_at, created_at")
          .eq("couple_id", coupleId!)
          .neq("user_id", myId)
          .order("updated_at", { ascending: false })
          .limit(3),
        supabase
          .from("diary_entries")
          .select("id, title, body, created_at, created_by")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("todos")
          .select("id, title, done, created_at, created_by, updated_at")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("bucket_list")
          .select("id, title, done, created_at, created_by")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("expenses")
          .select("id, amount, category, created_at, created_by")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("games")
          .select("id, kind, status, turn, finished_at, created_by, updated_at")
          .eq("couple_id", coupleId!)
          .order("updated_at", { ascending: false })
          .limit(10),
        supabase
          .from("events")
          .select("id, title, event_date, created_at, created_by")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase.from("couples").select("id, theme, updated_at").eq("id", coupleId!).maybeSingle(),
      ]);

      // Messages
      for (const m of msgs.data ?? []) {
        if (!m.read_at || isAfter(m.created_at, seenAt)) {
          items.push({
            id: `msg-${m.id}`,
            kind: "message",
            title: "New message",
            body: m.body?.slice(0, 80) || `${partnerName} sent you a message`,
            href: "/chat",
            at: m.created_at,
          });
        }
      }

      // Photos / albums / feed posts
      for (const p of photos.data ?? []) {
        if (!isAfter(p.created_at, seenAt)) continue;
        if (p.album?.trim()) {
          items.push({
            id: `album-${p.id}`,
            kind: "album",
            title: "New album photo",
            body: `${partnerName} added to “${p.album.trim()}”`,
            href: "/photos",
            at: p.created_at,
          });
        } else if (p.storage_path) {
          items.push({
            id: `photo-${p.id}`,
            kind: "photo",
            title: "New memory",
            body: p.caption?.trim() || `${partnerName} posted a photo`,
            href: "/photos",
            at: p.created_at,
          });
        } else {
          items.push({
            id: `feed-${p.id}`,
            kind: "photo",
            title: "New feed post",
            body: p.body?.slice(0, 80) || p.caption?.trim() || `${partnerName} wrote on the feed`,
            href: "/photos",
            at: p.created_at,
          });
        }
      }

      // Daily question
      const ans = answers.data ?? [];
      const partnerAns = ans.find((r) => r.created_by !== myId);
      const iAns = ans.find((r) => r.created_by === myId);
      if (partnerAns) {
        if (!iAns) {
          items.push({
            id: `q-reveal-${todayISO()}`,
            kind: "question",
            title: "Today’s question",
            body: `${partnerName} answered — your turn to reply`,
            href: "/questions",
            at: partnerAns.created_at,
          });
        } else if (isAfter(partnerAns.created_at, seenAt)) {
          items.push({
            id: `q-both-${todayISO()}`,
            kind: "question",
            title: "Both answered today",
            body: `You and ${partnerName} completed today’s question`,
            href: "/questions",
            at: partnerAns.created_at,
          });
        }
      }

      // Feelings / cool-down
      for (const f of feelings.data ?? []) {
        if (!f.shared && f.created_by !== myId) continue;
        if (!isAfter(f.created_at, seenAt)) continue;
        items.push({
          id: `feel-${f.id}`,
          kind: "feeling",
          title: `${partnerName} updated how they feel`,
          body: f.need
            ? `Needs: ${f.need}`
            : f.feeling?.slice(0, 80) || "Open Care to see more",
          href: "/wellbeing",
          at: f.created_at,
        });
      }

      // Cycle phase (only if partner shares cycle)
      const partnerSharesCycle = !!(partner as { share_cycle?: boolean } | null)?.share_cycle;
      if (partnerSharesCycle) {
        for (const c of cycles.data ?? []) {
          const at = c.updated_at || c.created_at;
          const info = phaseInfo(c.start_date, c.cycle_length, c.period_length);
          if (!info) continue;
          // Notify when log is new/updated, or once per day so phase stays visible
          const dayKey = todayISO();
          const show =
            isAfter(at, seenAt) ||
            !seenAt ||
            (seenAt.slice(0, 10) !== dayKey);
          if (show) {
            items.push({
              id: `cycle-${c.id}-${dayKey}`,
              kind: "cycle",
              title: `${partnerName}’s cycle: ${info.name}`,
              body: info.meaning,
              href: "/period",
              at: isAfter(at, seenAt) ? at : new Date().toISOString(),
            });
          }
          break;
        }
      }

      // Nest: diary
      for (const d of diary.data ?? []) {
        if (!isAfter(d.created_at, seenAt)) continue;
        items.push({
          id: `diary-${d.id}`,
          kind: "diary",
          title: "New diary entry",
          body: d.title || d.body?.slice(0, 80) || `${partnerName} wrote in the diary`,
          href: "/diary",
          at: d.created_at,
        });
      }

      // Nest: todos
      for (const t of todos.data ?? []) {
        if (!isAfter(t.created_at, seenAt)) continue;
        items.push({
          id: `todo-${t.id}`,
          kind: "todo",
          title: t.done ? "To-do completed" : "New to-do",
          body: t.title,
          href: "/todos",
          at: t.created_at,
        });
      }

      // Nest: bucket
      for (const b of bucket.data ?? []) {
        if (!isAfter(b.created_at, seenAt)) continue;
        items.push({
          id: `bucket-${b.id}`,
          kind: "bucket",
          title: b.done ? "Dream checked off" : "New bucket list item",
          body: b.title,
          href: "/bucket",
          at: b.created_at,
        });
      }

      // Nest: expenses
      for (const e of expenses.data ?? []) {
        if (!isAfter(e.created_at, seenAt)) continue;
        items.push({
          id: `exp-${e.id}`,
          kind: "expense",
          title: "New expense",
          body: `${e.category ?? "Expense"} · ${e.amount}`,
          href: "/budget",
          at: e.created_at,
        });
      }

      // Games needing attention
      for (const g of games.data ?? []) {
        const needsMe =
          (g.status === "playing" && g.turn === myId) ||
          (g.status === "done" && g.created_by !== myId && isAfter(g.finished_at, seenAt));
        if (!needsMe) continue;
        items.push({
          id: `game-${g.id}`,
          kind: "game",
          title: g.status === "done" ? "Game finished" : "Your turn",
          body: `A ${g.kind?.replace(/_/g, " ") || "game"} needs attention`,
          href: "/games",
          at: g.updated_at || g.finished_at || new Date().toISOString(),
        });
      }

      // Calendar
      for (const e of events.data ?? []) {
        if (!isAfter(e.created_at, seenAt)) continue;
        items.push({
          id: `evt-${e.id}`,
          kind: "calendar",
          title: "New calendar plan",
          body: `${e.title} · ${e.event_date}`,
          href: "/calendar",
          at: e.created_at,
        });
      }

      // Settings / theme shared change
      const coupleRow = couple.data as { theme?: unknown; updated_at?: string } | null;
      if (coupleRow?.theme && isAfter(coupleRow.updated_at, seenAt)) {
        items.push({
          id: `theme-${coupleRow.updated_at}`,
          kind: "settings",
          title: "App colors updated",
          body: "Someone changed your shared theme",
          href: "/profile",
          at: coupleRow.updated_at!,
        });
      }

      // Sort newest first, dedupe by id
      const seen = new Set<string>();
      const unique = items
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        .filter((n) => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        })
        .slice(0, 40);

      const unseenCount = unique.filter((n) => isAfter(n.at, seenAt)).length;

      return { items: unique, unseenCount, seenAt };
    },
  });
}

export function useMarkNotificationsSeen() {
  const qc = useQueryClient();
  return () => {
    writeNotifSeenAt();
    void qc.invalidateQueries({ queryKey: ["app-notifications"] });
  };
}

/** Optional: mark seen when opening the panel */
export function useAutoMarkSeenOnOpen(open: boolean) {
  const mark = useMarkNotificationsSeen();
  useEffect(() => {
    if (open) mark();
  }, [open, mark]);
}
