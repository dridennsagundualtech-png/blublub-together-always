/**
 * PHONE BUILD ONLY — stands in for `src/lib/admin.functions.ts`.
 *
 * The real file holds server functions: they run on the server and use the secret admin key,
 * which must never be packed into an app that ships to phones. The phone build
 * (`vite.config.spa.ts`) swaps that file for this one, so the owner's "Member access" page
 * still opens there but explains that it lives in the web app.
 *
 * Keep the exported names and shapes the same as the real file.
 */
import type { AdminUserRow } from "@/lib/admin.functions";

export type { AdminUserRow };

const WEB_ONLY = "Member access is managed in the web app, not in the phone app.";

export async function listAppUsers(): Promise<AdminUserRow[]> {
  throw new Error(WEB_ONLY);
}

export async function setUserAccess(_input: {
  data: { userId: string; isPremium?: boolean; spicyEnabled?: boolean; premiumDays?: number };
}): Promise<{ ok: boolean }> {
  throw new Error(WEB_ONLY);
}

export async function grantLovePoints(_input: {
  data: { userId: string; amount: number };
}): Promise<{ ok: boolean; love_points?: number }> {
  throw new Error(WEB_ONLY);
}
