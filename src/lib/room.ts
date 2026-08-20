import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuthUser, useCoupleId } from "@/lib/session";

export type RoomRow = Tables<"rooms">;
export type RoomItemRow = Tables<"room_items">;

export {
  ROOM_CATALOG,
  ITEM_BY_KEY,
  THEME_LABELS,
  ROOM_THEMES,
  type RoomItem,
  type RoomTheme,
} from "@/lib/room-catalog";
import { ITEM_BY_KEY } from "@/lib/room-catalog";


export const PLANT_STAGES = [
  { glyph: "🌱", label: "Seed" },
  { glyph: "🌿", label: "Small sprout" },
  { glyph: "🪴", label: "Growing plant" },
  { glyph: "🌷", label: "Flowering plant" },
  { glyph: "🌳", label: "Fully grown" },
] as const;

export function plantStage(growth: number) {
  const idx = Math.min(PLANT_STAGES.length - 1, Math.floor(growth / 25));
  return { index: idx, ...PLANT_STAGES[idx]! };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** The couple's room record — created lazily on first visit. */
export function useRoom() {
  const coupleId = useCoupleId();
  return useQuery({
    queryKey: ["room", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("couple_id", coupleId!)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as RoomRow;
      const created = await supabase
        .from("rooms")
        .insert({ couple_id: coupleId! })
        .select("*")
        .maybeSingle();
      if (created.error) throw created.error;
      return created.data as RoomRow;
    },
  });
}

export function useRoomItems() {
  const coupleId = useCoupleId();
  const qc = useQueryClient();

  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`room-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_items", filter: `couple_id=eq.${coupleId}` },
        () => void qc.invalidateQueries({ queryKey: ["room-items", coupleId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `couple_id=eq.${coupleId}` },
        () => void qc.invalidateQueries({ queryKey: ["room", coupleId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc]);

  return useQuery({
    queryKey: ["room-items", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_items")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RoomItemRow[];
    },
  });
}

export function useRoomUnlocks() {
  const coupleId = useCoupleId();
  return useQuery({
    queryKey: ["room-unlocks", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_unlocks")
        .select("item_key")
        .eq("couple_id", coupleId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.item_key);
    },
  });
}

export function useRoomActions() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: room } = useRoom();
  const qc = useQueryClient();

  const refreshItems = () => qc.invalidateQueries({ queryKey: ["room-items", coupleId] });
  const refreshRoom = () => qc.invalidateQueries({ queryKey: ["room", coupleId] });

  const place = useMutation({
    mutationFn: async (v: { itemKey: string; x?: number; y?: number }) => {
      const { error } = await supabase.from("room_items").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        item_key: v.itemKey,
        x: v.x ?? 50,
        y: v.y ?? 70,
      });
      if (error) throw error;
    },
    onSuccess: () => void refreshItems(),
  });

  const move = useMutation({
    mutationFn: async (v: { id: string; x: number; y: number }) => {
      const { error } = await supabase
        .from("room_items")
        .update({ x: v.x, y: v.y })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => void refreshItems(),
  });

  const transform = useMutation({
    mutationFn: async (v: { id: string; rotation?: number; scale?: number }) => {
      const patch: { rotation?: number; scale?: number } = {};
      if (v.rotation !== undefined) patch.rotation = v.rotation;
      if (v.scale !== undefined) patch.scale = v.scale;
      const { error } = await supabase.from("room_items").update(patch).eq("id", v.id);

      if (error) throw error;
    },
    onSuccess: () => void refreshItems(),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("room_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void refreshItems(),
  });

  const unlock = useMutation({
    mutationFn: async (itemKey: string) => {
      const item = ITEM_BY_KEY.get(itemKey);
      if (!item || !room) throw new Error("Unknown item");
      if (room.love_points < item.cost) throw new Error("Not enough Love Points yet");
      const { error } = await supabase
        .from("room_unlocks")
        .insert({ couple_id: coupleId!, item_key: itemKey });
      if (error) throw error;
      const spent = await supabase
        .from("rooms")
        .update({ love_points: room.love_points - item.cost })
        .eq("couple_id", coupleId!);
      if (spent.error) throw spent.error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["room-unlocks", coupleId] });
      void refreshRoom();
    },
  });

  /** Water the shared plant — once a day, grows it and earns Love Points. */
  const water = useMutation({
    mutationFn: async () => {
      if (!room) throw new Error("No room yet");
      if (room.plant_watered_on === today()) throw new Error("Already watered today");
      const { error } = await supabase
        .from("rooms")
        .update({
          plant_growth: Math.min(100, room.plant_growth + 5),
          plant_watered_on: today(),
          love_points: room.love_points + 15,
        })
        .eq("couple_id", coupleId!);
      if (error) throw error;
    },
    onSuccess: () => void refreshRoom(),
  });

  return { place, move, transform, remove, unlock, water, wateredToday: room?.plant_watered_on === today() };
}
