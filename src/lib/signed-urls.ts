/**
 * Links to private storage files (photos, avatars, voice notes) that stay the same for a week,
 * remembered on this device. A fresh link on every visit meant the browser could never reuse a
 * picture it already had, so every photo downloaded again each time — and that downloading is
 * what Supabase counts as egress.
 */
import { supabase } from "@/integrations/supabase/client";

const KEY = "blublub:signed-urls";
const LIFE_S = 7 * 24 * 3600; // how long a link works
const RENEW_MS = 24 * 3600_000; // ask for a new one once less than a day is left

type Saved = Record<string, { url: string; until: number }>;
let saved: Saved | null = null;

function load(): Saved {
  if (saved) return saved;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Saved;
  } catch {
    saved = {};
  }
  return saved;
}

function store(s: Saved) {
  const now = Date.now();
  for (const [k, v] of Object.entries(s)) if (v.until <= now) delete s[k];
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the links still work for this visit */
  }
}

/** Links for many files of one bucket in a single request, keyed by path (missing files left out). */
export async function signedUrls(bucket: string, paths: string[]): Promise<Map<string, string>> {
  const s = load();
  const now = Date.now();
  const missing = [...new Set(paths)].filter(
    (p) => (s[`${bucket}/${p}`]?.until ?? 0) < now + RENEW_MS,
  );
  if (missing.length) {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(missing, LIFE_S);
    for (const d of data ?? []) {
      if (d.path && d.signedUrl) {
        s[`${bucket}/${d.path}`] = { url: d.signedUrl, until: now + LIFE_S * 1000 };
      }
    }
    store(s);
  }
  const urls = new Map<string, string>();
  for (const p of paths) {
    const hit = s[`${bucket}/${p}`];
    if (hit) urls.set(p, hit.url);
  }
  return urls;
}

export async function signedUrl(bucket: string, path: string): Promise<string | null> {
  return (await signedUrls(bucket, [path])).get(path) ?? null;
}

/** After replacing a file at the same path (avatars), so the next link shows the new one. */
export function forgetSignedUrl(bucket: string, path: string) {
  const s = load();
  delete s[`${bucket}/${path}`];
  store(s);
}

/** On sign-out, so the links don't stay behind on a shared device. */
export function forgetAllSignedUrls() {
  saved = {};
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
