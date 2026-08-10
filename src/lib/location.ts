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
 * Returns a human-readable status so screens can explain why a pin is missing.
 */
export function useLocationPublisher() {
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const coupleId = useCoupleId();
  const qc = useQueryClient();
  const sharing = !!profile?.share_location;
  const lastSent = useRef(0);
  const [status, setStatus] = useState<string | null>(null);

  const push = useCallback(
    async (pos: GeolocationPosition, force = false) => {
      if (!user?.id) return;
      const now = Date.now();
      if (!force && now - lastSent.current < 20_000) return;
      lastSent.current = now;
      const { error } = await supabase.from("locations").upsert(
        {
          user_id: user.id,
          couple_id: coupleId ?? null,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) {
        console.warn("location upsert failed", error);
        setStatus(`Couldn't save your location: ${error.message}`);
        return;
      }
      setStatus(null);
      void qc.invalidateQueries({ queryKey: ["locations", coupleId] });
    },
    [user?.id, coupleId, qc],
  );

  useEffect(() => {
    if (!user?.id) return;
    if (!sharing) {
      setStatus(null);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("This device or browser doesn't provide location.");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("Location needs a secure (https) connection.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => void push(pos, true),
      (err) => setStatus(`Location unavailable: ${err.message}`),
      { enableHighAccuracy: false, maximumAge: 0, timeout: 20_000 },
    );

    const id = navigator.geolocation.watchPosition(
      (pos) => void push(pos),
      (err) => setStatus(`Location unavailable: ${err.message}`),
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [sharing, user?.id, push]);

  return status;
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
