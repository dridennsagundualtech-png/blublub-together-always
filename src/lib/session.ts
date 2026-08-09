import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Couple = Tables<"couples">;

export function useAuthUser() {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
    staleTime: 60_000,
  });
}

export function useProfile() {
  const { data: user } = useAuthUser();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

/** Both members of the current couple space (may be just one while unpaired). */
export function useMembers() {
  const { data: profile } = useProfile();
  const coupleId = profile?.couple_id ?? null;
  return useQuery({
    queryKey: ["members", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("couple_id", coupleId!);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function usePartner() {
  const { data: profile } = useProfile();
  const { data: members } = useMembers();
  return members?.find((m) => m.id !== profile?.id) ?? null;
}

export function useCouple() {
  const { data: profile } = useProfile();
  const coupleId = profile?.couple_id ?? null;
  return useQuery({
    queryKey: ["couple", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("couples")
        .select("*")
        .eq("id", coupleId!)
        .maybeSingle();
      if (error) throw error;
      return data as Couple | null;
    },
  });
}

/** Convenience: the couple id, or null when not paired yet. */
export function useCoupleId() {
  const { data: profile } = useProfile();
  return profile?.couple_id ?? null;
}

export function useRefreshSession() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["auth-user"] });
    void qc.invalidateQueries({ queryKey: ["profile"] });
  };
}

export function daysTogether(anniversary: string | null | undefined): number | null {
  if (!anniversary) return null;
  const start = new Date(`${anniversary}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  const ms = now.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor(ms / 86_400_000));
}
