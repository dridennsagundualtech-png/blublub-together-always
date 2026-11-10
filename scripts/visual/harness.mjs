// Test harness: opens the local app in a phone-sized browser with Supabase mocked in-memory.
// Nothing here talks to the real Supabase project.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

export const BASE = process.env.BASE || "http://127.0.0.1:5173";
const SB = "https://gwanqnpeuzruzuwksfsp.supabase.co";
export const ME = "11111111-1111-4111-8111-111111111111";
export const PARTNER = "22222222-2222-4222-8222-222222222222";
export const COUPLE = "33333333-3333-4333-8333-333333333333";

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
const jwt = (sub) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, exp, role: "authenticated", aud: "authenticated" })}.sig`;
const userObj = (id, email) => ({
  id,
  aud: "authenticated",
  role: "authenticated",
  email,
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
});

/** Shared fake database so two pages (two "phones") can play each other. */
export function makeDb(theme) {
  return {
    games: [],
    theme: theme ?? null,
    profiles: [
      { id: ME, couple_id: COUPLE, display_name: "Den", avatar_url: null, adult_confirmed: false, is_premium: true },
      { id: PARTNER, couple_id: COUPLE, display_name: "Angel", avatar_url: null, adult_confirmed: false, is_premium: true },
    ],
  };
}

function parseFilters(url) {
  const out = {};
  for (const [k, v] of url.searchParams) {
    if (v.startsWith("eq.")) out[k] = v.slice(3);
  }
  return out;
}

export async function mockSupabase(context, db, who) {
  await context.route(`${SB}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const method = req.method();
    const wantsObject = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" },
        body: JSON.stringify(body),
      });
    if (method === "OPTIONS") return json({});
    if (p.startsWith("/auth/v1/user")) return json(userObj(who, who === ME ? "den@example.com" : "angel@example.com"));
    if (p.startsWith("/auth/v1/")) return json({});
    if (p.startsWith("/rest/v1/rpc/")) return json(null);
    if (p.startsWith("/rest/v1/")) {
      const table = p.slice("/rest/v1/".length);
      const f = parseFilters(url);
      if (table === "profiles") {
        const rows = db.profiles.filter((r) => Object.entries(f).every(([k, v]) => String(r[k]) === v));
        return json(wantsObject ? (rows[0] ?? null) : rows);
      }
      if (table === "couples") {
        const c = { id: COUPLE, invite_code: "ABC123", anniversary: "2020-03-04", theme: db.theme, created_at: "2026-01-01T00:00:00Z" };
        return json(wantsObject ? c : [c]);
      }
      if (table === "games") {
        if (method === "GET") {
          const rows = [...db.games].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
          return json(rows);
        }
        if (method === "POST") {
          const body = JSON.parse(req.postData() || "{}");
          const row = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            finished_at: null,
            winner_id: null,
            is_draw: false,
            status: "playing",
            task: "",
            state: {},
            turn: null,
            ...body,
          };
          db.games.push(row);
          return json(wantsObject ? row : [row], 201);
        }
        if (method === "PATCH") {
          const body = JSON.parse(req.postData() || "{}");
          const row = db.games.find((g) => g.id === f.id);
          if (row) Object.assign(row, body, { updated_at: new Date().toISOString() });
          return json(wantsObject ? row : []);
        }
      }
      if (method === "GET") return json(wantsObject ? null : []);
      return json(wantsObject ? null : []);
    }
    if (p.startsWith("/storage/")) return json({});
    return json({});
  });
}

export async function openPhone(browser, { signedIn = false, who = ME, db = makeDb(), skin = null, theme = null, scale = 1 } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: scale,
    hasTouch: true,
    isMobile: true,
  });
  await mockSupabase(context, db, who);
  // Lovable-hosted art is not reachable locally; answer quickly so pages settle.
  await context.route("**/__l5e/**", (r) => r.fulfill({ status: 404, body: "" }));
  const session = {
    access_token: jwt(who),
    refresh_token: "r",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: exp,
    user: userObj(who, "x@example.com"),
  };
  await context.addInitScript(
    ([signed, sess, skinId, themeObj]) => {
      try {
        if (signed) localStorage.setItem("sb-gwanqnpeuzruzuwksfsp-auth-token", JSON.stringify(sess));
        if (themeObj) localStorage.setItem("blublub-theme-v2", JSON.stringify(themeObj));
        else if (skinId) {
          localStorage.setItem(
            "blublub-theme-v2",
            JSON.stringify({
              skin: skinId,
              main: "#FFAFCC",
              soft: "#FFC8DD",
              purple: "#CDB4DB",
              blue: "#A2D2FF",
              gradFrom: "#CDB4DB",
              gradTo: "#FFAFCC",
            }),
          );
        }
      } catch {}
    },
    [signedIn, session, skin, theme],
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  return { context, page, errors };
}

export async function launch() {
  return chromium.launch();
}

export const settle = (page, ms = 900) => page.waitForTimeout(ms);
