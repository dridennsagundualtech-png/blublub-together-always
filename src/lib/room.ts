import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuthUser, useCoupleId } from "@/lib/session";

export type RoomRow = Tables<"rooms">;
export type RoomItemRow = Tables<"room_items">;

export type RoomCategory =
  | "furniture"
  | "plants"
  | "wall"
  | "floor"
  | "mascot"
  | "special";

export type RoomItem = {
  key: string;
  label: string;
  glyph: string;
  category: RoomCategory;
  cost: number;
  size: number;
  /** Items that hang on the wall default to the upper half of the room. */
  wall?: boolean;
};

export const CATEGORY_LABELS: Record<RoomCategory, string> = {
  furniture: "Furniture",
  plants: "Plants",
  wall: "Wall decor",
  floor: "Floor decor",
  mascot: "Mascot items",
  special: "Couple items",
};

export const ROOM_CATALOG: RoomItem[] = [
  // Furniture
  { key: "bed", label: "Cosy bed", glyph: "🛏️", category: "furniture", cost: 0, size: 88 },
  { key: "couch", label: "Cosy couch", glyph: "🛋️", category: "furniture", cost: 50, size: 84 },
  { key: "chair", label: "Little chair", glyph: "🪑", category: "furniture", cost: 30, size: 60 },
  { key: "table", label: "Small table", glyph: "🪵", category: "furniture", cost: 40, size: 64 },
  { key: "bookshelf", label: "Bookshelf", glyph: "📚", category: "furniture", cost: 80, size: 68 },
  { key: "cabinet", label: "Cabinet", glyph: "🗄️", category: "furniture", cost: 90, size: 66 },
  { key: "desk", label: "Small desk", glyph: "🖥️", category: "furniture", cost: 110, size: 64 },
  // Plants
  { key: "starter-plant", label: "Starter plant", glyph: "🌱", category: "plants", cost: 0, size: 44 },
  { key: "potted-plant", label: "Potted plant", glyph: "🪴", category: "plants", cost: 60, size: 52 },
  { key: "flower-pot", label: "Flower pot", glyph: "🌷", category: "plants", cost: 150, size: 48 },
  { key: "cactus", label: "Tiny cactus", glyph: "🌵", category: "plants", cost: 70, size: 44 },
  // Wall
  { key: "painting", label: "Painting", glyph: "🖼️", category: "wall", cost: 60, size: 56, wall: true },
  { key: "poster", label: "Poster", glyph: "🪧", category: "wall", cost: 40, size: 52, wall: true },
  { key: "clock", label: "Wall clock", glyph: "🕰️", category: "wall", cost: 70, size: 48, wall: true },
  { key: "window", label: "Extra window", glyph: "🪟", category: "wall", cost: 120, size: 64, wall: true },
  { key: "lantern", label: "Hanging lantern", glyph: "🏮", category: "wall", cost: 90, size: 46, wall: true },
  // Floor
  { key: "rug", label: "Soft rug", glyph: "🟫", category: "floor", cost: 50, size: 80 },
  { key: "lamp", label: "Warm lamp", glyph: "🪔", category: "floor", cost: 45, size: 48 },
  { key: "beanbag", label: "Bean bag", glyph: "🟣", category: "floor", cost: 65, size: 60 },
  { key: "guitar", label: "Guitar", glyph: "🎸", category: "floor", cost: 100, size: 56 },
  // Mascot items
  { key: "penguin-plushie", label: "Penguin plushie", glyph: "🐧", category: "mascot", cost: 100, size: 48 },
  { key: "seal-plushie", label: "Seal plushie", glyph: "🦭", category: "mascot", cost: 100, size: 48 },
  { key: "cat-bed", label: "Cat bed", glyph: "🧺", category: "mascot", cost: 250, size: 54 },
  { key: "food-bowl", label: "Snack bowl", glyph: "🍥", category: "mascot", cost: 35, size: 40 },
  { key: "teddy", label: "Stuffed bear", glyph: "🧸", category: "mascot", cost: 80, size: 46 },
  // Couple items
  { key: "photo-frame", label: "Couple photo frame", glyph: "🖼️", category: "special", cost: 200, size: 52, wall: true },
  { key: "love-letter", label: "Love letter", glyph: "💌", category: "special", cost: 120, size: 42 },
  { key: "anniversary", label: "Anniversary banner", glyph: "🎉", category: "special", cost: 180, size: 56, wall: true },
  { key: "gift-box", label: "Gift box", glyph: "🎁", category: "special", cost: 90, size: 46 },
  { key: "trophy", label: "Couple trophy", glyph: "🏆", category: "special", cost: 300, size: 46 },
  { key: "memory-board", label: "Memory board", glyph: "📌", category: "special", cost: 220, size: 54, wall: true },
];

export const ITEM_BY_KEY = new Map(ROOM_CATALOG.map((i) => [i.key, i]));

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
      const item = ITEM_BY_KEY.get(v.itemKey);
      const { error } = await supabase.from("room_items").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        item_key: v.itemKey,
        x: v.x ?? 50,
        y: v.y ?? (item?.wall ? 28 : 70),
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
