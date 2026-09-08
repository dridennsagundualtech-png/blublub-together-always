import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/badges";
import { useAuthUser, useCoupleId, usePartner } from "@/lib/session";

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
  at: string;
  read: boolean;
};

const SEEN_KEY = "blublub:notif-seen-at";
const DELETED_KEY = "blublub:notif-deleted-ids";

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

export function readDeletedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function writeDeletedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const list = [...ids].slice(-200);
    window.localStorage.setItem(DELETED_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function deleteNotificationId(id: string) {
  const set = readDeletedIds();
  set.add(id);
  writeDeletedIds(set);
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

export function useAppNotifications() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const partner = usePartner();
  const partnerName = partner?.display_name ?? "Partner";

  return useQuery({
    queryKey: ["app-notifications", coupleId, user?.id],
    enabled: !!coupleId && !!user?.id,
    refetchInterval: 25_000,
    queryFn: async () => {
      const myId = user!.id;
      const seenAt = readNotifSeenAt();
      const deleted = readDeletedIds();
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
          .limit(8),
        supabase
          .from("photos")
          .select("id, caption, album, storage_path, created_at, created_by, body")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(12),
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
          .limit(5),
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
          .limit(5),
        supabase
          .from("todos")
          .select("id, title, done, created_at, created_by, updated_at")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("bucket_list")
          .select("id, title, done, created_at, created_by")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("expenses")
          .select("id, amount, category, created_at, created_by")
          .eq("couple_id", coupleId!)
          .neq("created_by", myId)
          .order("created_at", { ascending: false })
          .limit(5),
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
          .limit(5),
        supabase.from("couples").select("id, theme, updated_at").eq("id", coupleId!).maybeSingle(),
      ]);

      const push = (n: Omit<AppNotification, "read">) => {
        if (deleted.has(n.id)) return;
        items.push({
          ...n,
          read: !isAfter(n.at, seenAt),
        });
      };

      for (const m of msgs.data ?? []) {
        push({
          id: `msg-${m.id}`,
          kind: "message",
          title: "New message",
          body: m.body?.slice(0, 80) || `${partnerName} sent you a message`,
          href: "/chat",
          at: m.created_at,
        });
      }

      for (const p of photos.data ?? []) {
        if (p.album?.trim()) {
          push({
            id: `album-${p.id}`,
            kind: "album",
            title: "New album photo",
            body: `${partnerName} added to "${p.album.trim()}"`,
            href: "/photos",
            at: p.created_at,
          });
        } else if (p.storage_path) {
          push({
            id: `photo-${p.id}`,
            kind: "photo",
            title: "New memory",
            body: p.caption?.trim() || `${partnerName} posted a photo`,
            href: "/photos",
            at: p.created_at,
          });
        } else {
          push({
            id: `feed-${p.id}`,
            kind: "photo",
            title: "New feed post",
            body: p.body?.slice(0, 80) || p.caption?.trim() || `${partnerName} wrote on the feed`,
            href: "/photos",
            at: p.created_at,
          });
        }
      }

      const ans = answers.data ?? [];
      const partnerAns = ans.find((r) => r.created_by !== myId);
      const iAns = ans.find((r) => r.created_by === myId);
      if (partnerAns) {
        if (!iAns) {
          push({
            id: `q-reveal-${todayISO()}`,
            kind: "question",
            title: "Today's question",
            body: `${partnerName} answered — your turn to reply`,
            href: "/questions",
            at: partnerAns.created_at,
          });
        } else {
          push({
            id: `q-both-${todayISO()}`,
            kind: "question",
            title: "Both answered today",
            body: `You and ${partnerName} completed today's question`,
            href: "/questions",
            at: partnerAns.created_at,
          });
        }
      }

      for (const f of feelings.data ?? []) {
        if (!f.shared) continue;
        push({
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

      const partnerSharesCycle = !!(partner as { share_cycle?: boolean } | null)?.share_cycle;
      if (partnerSharesCycle) {
        for (const c of cycles.data ?? []) {
          const at = c.updated_at || c.created_at;
          const info = phaseInfo(c.start_date, c.cycle_length, c.period_length);
          if (!info) continue;
          push({
            id: `cycle-${c.id}-${todayISO()}`,
            kind: "cycle",
            title: `${partnerName}'s cycle: ${info.name}`,
            body: info.meaning,
            href: "/period",
            at,
          });
          break;
        }
      }

      for (const d of diary.data ?? []) {
        push({
          id: `diary-${d.id}`,
          kind: "diary",
          title: "New diary entry",
          body: d.title || d.body?.slice(0, 80) || `${partnerName} wrote in the diary`,
          href: "/diary",
          at: d.created_at,
        });
      }

      for (const t of todos.data ?? []) {
        push({
          id: `todo-${t.id}`,
          kind: "todo",
          title: t.done ? "To-do completed" : "New to-do",
          body: t.title,
          href: "/todos",
          at: t.created_at,
        });
      }

      for (const b of bucket.data ?? []) {
        push({
          id: `bucket-${b.id}`,
          kind: "bucket",
          title: b.done ? "Dream checked off" : "New bucket list item",
          body: b.title,
          href: "/bucket",
          at: b.created_at,
        });
      }

      for (const e of expenses.data ?? []) {
        push({
          id: `exp-${e.id}`,
          kind: "expense",
          title: "New expense",
          body: `${e.category ?? "Expense"} · ${e.amount}`,
          href: "/budget",
          at: e.created_at,
        });
      }

      for (const g of games.data ?? []) {
        const needsMe =
          (g.status === "playing" && g.turn === myId) ||
          (g.status === "done" && g.created_by !== myId);
        if (!needsMe) continue;
        push({
          id: `game-${g.id}`,
          kind: "game",
          title: g.status === "done" ? "Game finished" : "Your turn",
          body: `A ${g.kind?.replace(/_/g, " ") || "game"} needs attention`,
          href: "/games",
          at: g.updated_at || g.finished_at || new Date().toISOString(),
        });
      }

      for (const e of events.data ?? []) {
        push({
          id: `evt-${e.id}`,
          kind: "calendar",
          title: "New calendar plan",
          body: `${e.title} · ${e.event_date}`,
          href: "/calendar",
          at: e.created_at,
        });
      }

      const coupleRow = couple.data as { theme?: unknown; updated_at?: string } | null;
      if (coupleRow?.theme && coupleRow.updated_at) {
        push({
          id: `theme-${coupleRow.updated_at}`,
          kind: "settings",
          title: "App colors updated",
          body: "Someone changed your shared theme",
          href: "/profile",
          at: coupleRow.updated_at,
        });
      }

      const seen = new Set<string>();
      const unique = items
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        .filter((n) => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        })
        .slice(0, 50);

      const unseenCount = unique.filter((n) => !n.read).length;

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

export function useDeleteNotification() {
  const qc = useQueryClient();
  return (id: string) => {
    deleteNotificationId(id);
    void qc.invalidateQueries({ queryKey: ["app-notifications"] });
  };
}
