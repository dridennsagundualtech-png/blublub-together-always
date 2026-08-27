import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useProfile } from "@/lib/session";

/** True when the signed-in account has the `admin` role. */
export function useIsAdmin() {
  const { data: user } = useAuthUser();
  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (error) throw error;
      return !!data;
    },
  });
}

/** Premium access: unexpired premium, or the admin account (unlocks everything). */
export function usePremiumAccess() {
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const until = profile?.premium_until ? new Date(profile.premium_until).getTime() : null;
  const active = !!profile?.is_premium && (until === null || until > Date.now());
  return active || !!isAdmin;
}

/** 18+ dice access: admin always, otherwise premium AND switched on by the owner. */
export function useSpicyAccess() {
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const premium = usePremiumAccess();
  return !!isAdmin || (premium && !!profile?.spicy_enabled);
}
