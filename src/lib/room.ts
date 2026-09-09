import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuthUser, useCoupleId } from "@/lib/session";
import { useIsAdmin } from "@/lib/admin";

export type RoomRow = Tables<"rooms"> & {
  room_pages?: RoomPage[] | null;
  active_room_id?: string | null;
};
export type RoomItemRow = Tables<"room_items"> & {
  room_page_id?: string | null;
};

export {
  ROOM_CATALOG,
  ITEM_BY_KEY,
  THEME_LABELS,
  ROOM_THEMES,
  type RoomItem,
  type RoomTheme,
} from "@/lib/room-catalog";
export {
  ROOM_BACKGROUNDS,
  BG_BY_KEY,
  DEFAULT_BACKGROUND_KEY,
  type RoomBackground,
  type BgCategory,
} from "@/lib/room-backgrounds";
export {
  SEED_STAGES,
  SEED_COLORS,
  SEED_CHARACTERS,
  seedStep,
  seedArt,
  seedThumb,
  type SeedColor,
} from "@/lib/room-seed";
import { ITEM_BY_KEY } from "@/lib/room-catalog";
import { BG_BY_KEY } from "@/lib/room-backgrounds";
import { seedStep } from "@/lib/room-seed";

/** Max rooms a couple can own (including the free first room). */
export const MAX_ROOM_PAGES = 4;

/** Love Point cost to unlock room slots 1..4 (slot 0 is free). */
export const ROOM_PAGE_COSTS = [0, 120, 250, 400] as const;

export type RoomPage = {
  id: string;
  name: string;
  background_key: string | null;
  pet_positions: Record<string, { x: number; y: number }>;
  pet_scales: Record<string, number>;
  pet_z: Record<string, number>;
  mascot_visibility: Record<string, boolean>;
};

export function plantStage(growth: number) {
  const s = seedStep(growth);
  return { index: s.step - 1, glyph: "🌱", label: s.label };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function newPageId() {
  return `room_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultRoomPage(partial?: Partial<RoomPage>): RoomPage {
  return {
    id: partial?.id ?? "main",
    name: partial?.name ?? "Our room",
    background_key: partial?.background_key ?? null,
    pet_positions: partial?.pet_positions ?? {},
    pet_scales: partial?.pet_scales ?? {},
    pet_z: partial?.pet_z ?? {},
    mascot_visibility: partial?.mascot_visibility ?? {},
  };
}

/** Normalize room_pages from DB (or legacy single-room row). */
export function ensureRoomPages(room: RoomRow | null | undefined): RoomPage[] {
  if (!room) return [defaultRoomPage()];
  const raw = room.room_pages;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.slice(0, MAX_ROOM_PAGES).map((p, i) =>
      defaultRoomPage({
        id: typeof p?.id === "string" ? p.id : i === 0 ? "main" : newPageId(),
        name: typeof p?.name === "string" && p.name.trim() ? p.name : i === 0 ? "Our room" : `Room ${i + 1}`,
        background_key: p?.background_key ?? (i === 0 ? room.background_key : null),
        pet_positions: (p?.pet_positions as RoomPage["pet_positions"]) ?? {},
        pet_scales: (p?.pet_scales as RoomPage["pet_scales"]) ?? {},
        pet_z: (p?.pet_z as RoomPage["pet_z"]) ?? {},
        mascot_visibility: (p?.mascot_visibility as RoomPage["mascot_visibility"]) ?? {},
      }),
    );
  }
  // Legacy: one room from top-level columns
  return [
    defaultRoomPage({
      id: "main",
      name: "Our room",
      background_key: room.background_key,
      pet_positions: (room.pet_positions as RoomPage["pet_positions"]) ?? {},
      pet_scales: (room.pet_scales as RoomPage["pet_scales"]) ?? {},
      pet_z: (room.pet_z as RoomPage["pet_z"]) ?? {},
      mascot_visibility: {},
    }),
  ];
}

export function costForNextRoom(currentCount: number): number | null {
  if (currentCount >= MAX_ROOM_PAGES) return null;
  return ROOM_PAGE_COSTS[currentCount] ?? 400;
}

/** The couple's room record — created lazily on first visit. Seed lives here (shared). */
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
      let row = data as RoomRow | null;
      if (!row) {
        const created = await supabase
          .from("rooms")
          .insert({ couple_id: coupleId! })
          .select("*")
          .maybeSingle();
        if (created.error) throw created.error;
        row = created.data as RoomRow;
      }
      // Ensure room_pages exists in DB
      const pages = ensureRoomPages(row);
      if (!row.room_pages || !Array.isArray(row.room_pages) || row.room_pages.length === 0) {
        const patch = {
          room_pages: pages,
          active_room_id: pages[0]!.id,
        };
        const { data: updated, error: upErr } = await supabase
          .from("rooms")
          .update(patch as never)
          .eq("couple_id", coupleId!)
          .select("*")
          .maybeSingle();
        if (!upErr && updated) row = updated as RoomRow;
        else row = { ...row, ...patch };
      }
      return row as RoomRow;
    },
  });
}

/** Furniture for one room page (seed is not per-room). */
export function useRoomItems(roomPageId: string | null | undefined) {
  const coupleId = useCoupleId();
  const qc = useQueryClient();
  const pageId = roomPageId || "main";

  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`room-items-${coupleId}-${pageId}`)
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
  }, [coupleId, pageId, qc]);

  return useQuery({
    queryKey: ["room-items", coupleId, pageId],
    enabled: !!coupleId && !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_items")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as RoomItemRow[];
      // Include legacy rows with null room_page_id only on "main"
      return rows.filter((r) => {
        const id = r.room_page_id || "main";
        return id === pageId;
      });
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

export function useRoomActions(activePageId: string) {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: room } = useRoom();
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const refreshItems = () =>
    void qc.invalidateQueries({ queryKey: ["room-items", coupleId] });
  const refreshRoom = () => void qc.invalidateQueries({ queryKey: ["room", coupleId] });

  const pages = ensureRoomPages(room);
  const pageId = activePageId || pages[0]?.id || "main";

  async function writePages(nextPages: RoomPage[], extra?: Record<string, unknown>) {
    const { error } = await supabase
      .from("rooms")
      .update({ room_pages: nextPages, ...extra } as never)
      .eq("couple_id", coupleId!);
    if (error) throw error;
  }

  function patchActivePage(mutator: (p: RoomPage) => RoomPage, extra?: Record<string, unknown>) {
    const next = pages.map((p) => (p.id === pageId ? mutator(p) : p));
    return writePages(next, extra);
  }

  const place = useMutation({
    mutationFn: async (v: { itemKey: string; x?: number; y?: number }) => {
      const { error } = await supabase.from("room_items").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        item_key: v.itemKey,
        x: v.x ?? 50,
        y: v.y ?? 70,
        room_page_id: pageId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => void refreshItems(),
  });

  const move = useMutation({
    mutationFn: async (v: { id: string; x: number; y: number }) => {
      const { error } = await supabase.from("room_items").update({ x: v.x, y: v.y }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => void refreshItems(),
  });

  const transform = useMutation({
    mutationFn: async (v: { id: string; rotation?: number; scale?: number; z?: number }) => {
      const patch: { rotation?: number; scale?: number; z?: number } = {};
      if (v.rotation !== undefined) patch.rotation = v.rotation;
      if (v.scale !== undefined) patch.scale = v.scale;
      if (v.z !== undefined) patch.z = v.z;
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
      if (!isAdmin && room.love_points < item.cost) throw new Error("Not enough Love Points yet");
      const { error } = await supabase
        .from("room_unlocks")
        .insert({ couple_id: coupleId!, item_key: itemKey });
      if (error) throw error;
      if (!isAdmin) {
        const spent = await supabase
          .from("rooms")
          .update({ love_points: room.love_points - item.cost })
          .eq("couple_id", coupleId!);
        if (spent.error) throw spent.error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["room-unlocks", coupleId] });
      void refreshRoom();
    },
  });

  /** Water the shared plant once a day — not tied to which room you're in. */
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

  const setBackground = useMutation({
    mutationFn: async (key: string) => {
      const bg = BG_BY_KEY.get(key);
      if (!bg || !room) throw new Error("Unknown background");
      if (bg.cost > 0 && !isAdmin) {
        const owned = await supabase
          .from("room_unlocks")
          .select("item_key")
          .eq("couple_id", coupleId!)
          .eq("item_key", key)
          .maybeSingle();
        if (owned.error) throw owned.error;
        if (!owned.data) {
          if (room.love_points < bg.cost) throw new Error("Not enough Love Points yet");
          const ins = await supabase
            .from("room_unlocks")
            .insert({ couple_id: coupleId!, item_key: key });
          if (ins.error) throw ins.error;
          const spent = await supabase
            .from("rooms")
            .update({ love_points: room.love_points - bg.cost })
            .eq("couple_id", coupleId!);
          if (spent.error) throw spent.error;
        }
      }
      await patchActivePage((p) => ({ ...p, background_key: key }), {
        // keep legacy column in sync for first page
        ...(pageId === "main" || pageId === pages[0]?.id ? { background_key: key } : {}),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["room-unlocks", coupleId] });
      void refreshRoom();
    },
  });

  const setSeedVariant = useMutation({
    mutationFn: async (v: { color?: string; character?: string | null }) => {
      const patch: { seed_color?: string; seed_character?: string | null } = {};
      if (v.color !== undefined) patch.seed_color = v.color;
      if (v.character !== undefined) patch.seed_character = v.character;
      const { error } = await supabase.from("rooms").update(patch).eq("couple_id", coupleId!);
      if (error) throw error;
    },
    onSuccess: () => void refreshRoom(),
  });

  const setPetScale = useMutation({
    mutationFn: async (v: { key: string; scale: number }) => {
      await patchActivePage((p) => ({
        ...p,
        pet_scales: {
          ...p.pet_scales,
          [v.key]: Math.round(v.scale * 100) / 100,
        },
      }));
    },
    onSuccess: () => void refreshRoom(),
  });

  const setPetPosition = useMutation({
    mutationFn: async (v: { key: string; x: number; y: number }) => {
      await patchActivePage((p) => ({
        ...p,
        pet_positions: {
          ...p.pet_positions,
          [v.key]: {
            x: Math.round(v.x * 10) / 10,
            y: Math.round(v.y * 10) / 10,
          },
        },
      }));
    },
    onSuccess: () => void refreshRoom(),
  });

  const setPetZ = useMutation({
    mutationFn: async (v: { key: string; z: number }) => {
      await patchActivePage((p) => ({
        ...p,
        pet_z: { ...p.pet_z, [v.key]: Math.round(v.z) },
      }));
    },
    onSuccess: () => void refreshRoom(),
  });

  const setMascotVisible = useMutation({
    mutationFn: async (v: { key: string; visible: boolean }) => {
      await patchActivePage((p) => ({
        ...p,
        mascot_visibility: { ...p.mascot_visibility, [v.key]: v.visible },
      }));
    },
    onSuccess: () => void refreshRoom(),
  });

  /** Unlock a new empty room (max 4). Costs Love Points. Seed is not copied. */
  const addRoomPage = useMutation({
    mutationFn: async (name?: string) => {
      if (!room) throw new Error("No room yet");
      const current = ensureRoomPages(room);
      if (current.length >= MAX_ROOM_PAGES) {
        throw new Error("You already have the maximum of 4 rooms");
      }
      const cost = costForNextRoom(current.length) ?? 0;
      if (!isAdmin && room.love_points < cost) {
        throw new Error(`Need ${cost} Love Points to add a room`);
      }
      const page = defaultRoomPage({
        id: newPageId(),
        name: (name || "").trim() || `Room ${current.length + 1}`,
        background_key: null,
        pet_positions: {},
        pet_scales: {},
        pet_z: {},
        mascot_visibility: {},
      });
      const nextPages = [...current, page];
      const patch: Record<string, unknown> = {
        room_pages: nextPages,
        active_room_id: page.id,
      };
      if (!isAdmin && cost > 0) {
        patch["love_points"] = room.love_points - cost;
      }
      const { error } = await supabase
        .from("rooms")
        .update(patch as never)
        .eq("couple_id", coupleId!);
      if (error) throw error;
      return page;
    },
    onSuccess: () => void refreshRoom(),
  });

  const renameRoomPage = useMutation({
    mutationFn: async (v: { id: string; name: string }) => {
      const name = v.name.trim().slice(0, 24);
      if (!name) throw new Error("Name required");
      await writePages(pages.map((p) => (p.id === v.id ? { ...p, name } : p)));
    },
    onSuccess: () => void refreshRoom(),
  });

  return {
    place,
    move,
    transform,
    remove,
    unlock,
    water,
    setBackground,
    setSeedVariant,
    setPetScale,
    setPetPosition,
    setPetZ,
    setMascotVisible,
    addRoomPage,
    renameRoomPage,
    wateredToday: room?.plant_watered_on === today(),
    pages,
    pageId,
  };
}
