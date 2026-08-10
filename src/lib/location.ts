import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuthUser, useCoupleId, useProfile } from "@/lib/session";


export type LocationRow = Tables<"locations">;

/** Locations visible to me: mine plus my partner's when they opted in. */
export function useLocations() {
  const coupleId = useCoupleId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["locations", coupleId],
    enabled: !!coupleId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*");
      if (error) throw error;
      return (data ?? []) as LocationRow[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`locations-${coupleId}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "locations" }, () => {
          void qc.invalidateQueries({ queryKey: ["locations", coupleId] });
        })
        .subscribe();
    } catch (err) {
      console.warn("locations realtime subscribe failed", err);
    }
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [coupleId, qc]);

  return query;
}

/**
 * While the app is open and this user opted in, push their position up.
 * Foreground only — background tracking is intentionally out of scope.
 */
export function useLocationPublisher() {
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const coupleId = useCoupleId();
  const sharing = !!profile?.share_location;
  const lastSent = useRef(0);

  useEffect(() => {
    if (!sharing || !user?.id || typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent.current < 20_000) return;
        lastSent.current = now;
        void supabase.from("locations").upsert(
          {
            user_id: user.id,
            couple_id: coupleId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      },
      (err) => console.warn("geolocation error", err.message),
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [sharing, user?.id, coupleId]);
}

/** Removes my stored position (used when I switch sharing off). */
export async function clearMyLocation(userId: string) {
  await supabase.from("locations").delete().eq("user_id", userId);
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}
