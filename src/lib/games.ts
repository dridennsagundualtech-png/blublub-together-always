import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuthUser, useCoupleId, useMembers } from "@/lib/session";

export type GameRow = Tables<"games">;

export type GameKind = "tictactoe" | "rps" | "memory" | "connect4" | "war";

export const GAME_META: Record<GameKind, { label: string; blurb: string }> = {
  tictactoe: { label: "Tic-Tac-Toe", blurb: "Penguin vs Seal on the 3×3 grid" },
  rps: { label: "Rock Paper Scissors", blurb: "Cat, seal, penguin — best of 3" },
  memory: { label: "Memory Match", blurb: "Flip and match the critter pairs" },
  connect4: { label: "Connect Four", blurb: "Drop heads, get four in a row" },
  war: { label: "War", blurb: "High card takes the round" },
};

/** All recent games for the couple, kept live with realtime. */
export function useGames() {
  const coupleId = useCoupleId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["games", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as GameRow[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    // Unique topic per subscriber: several components can mount useGames at the
    // same time (and StrictMode double-mounts), and reusing one topic makes
    // supabase-js throw "cannot add postgres_changes callbacks after subscribe()".
    const channel = supabase
      .channel(`games-${coupleId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `couple_id=eq.${coupleId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["games", coupleId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc]);

  return query;
}

export function useActiveGame(kind: GameKind) {
  const { data, isLoading } = useGames();
  const game = useMemo(
    () => (data ?? []).find((g) => g.kind === kind && g.status === "playing") ?? null,
    [data, kind],
  );
  return { game, isLoading };
}

export function useGameHistory() {
  const { data } = useGames();
  return useMemo(() => (data ?? []).filter((g) => g.status === "done"), [data]);
}

/** Seat 0 is always the player who started the game. */
export function useSeats(game: GameRow | null) {
  const { data: user } = useAuthUser();
  const { data: members } = useMembers();
  const me = user?.id ?? null;
  const partnerId = members?.find((m) => m.id !== me)?.id ?? null;
  const players = game ? [game.created_by, game.created_by === me ? partnerId : me] : [me, partnerId];
  const seat = me && players[0] === me ? 0 : 1;
  return {
    me,
    partnerId,
    players: players as [string | null, string | null],
    seat,
    nameOf: (id: string | null | undefined) =>
      id === me ? "You" : (members?.find((m) => m.id === id)?.display_name ?? "Partner"),
  };
}

export function useCreateGame() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      kind: GameKind;
      task: string;
      state: unknown;
      turn?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("games")
        .insert({
          couple_id: coupleId!,
          created_by: user!.id,
          kind: input.kind,
          task: input.task,
          state: input.state as never,
          turn: input.turn ?? user!.id,
          status: "playing",
        })
        .select()
        .single();
      if (error) throw error;
      return data as GameRow;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["games", coupleId] }),
  });
}

export function useUpdateGame() {
  const coupleId = useCoupleId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<GameRow> }) => {
      const { error } = await supabase
        .from("games")
        .update(input.patch as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["games", coupleId] }),
  });
}

export function finishPatch(winnerId: string | null): Partial<GameRow> {
  return {
    status: "done",
    winner_id: winnerId,
    is_draw: !winnerId,
    finished_at: new Date().toISOString(),
  };
}

/** Deterministic shuffle helper (Fisher-Yates with Math.random). */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
