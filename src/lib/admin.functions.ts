import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string;
  is_premium: boolean;
  spicy_enabled: boolean;
  created_at: string;
};

/** Owner-only: every registered account with its email and access flags. */
export const listAppUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (authError) throw new Error(authError.message);

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id,display_name,is_premium,spicy_enabled");
    if (pErr) throw new Error(pErr.message);

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return authData.users.map((u) => {
      const p = byId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "—",
        display_name: p?.display_name ?? "—",
        is_premium: !!p?.is_premium,
        spicy_enabled: !!p?.spicy_enabled,
        created_at: u.created_at,
      };
    });
  });

/** Owner-only: grant or revoke premium / 18+ access for one account. */
export const setUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; isPremium?: boolean; spicyEnabled?: boolean }) => {
    if (!input?.userId) throw new Error("Missing user");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, boolean> = {};
    if (typeof data.isPremium === "boolean") patch['is_premium'] = data.isPremium;
    if (typeof data.spicyEnabled === "boolean") patch['spicy_enabled'] = data.spicyEnabled;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
