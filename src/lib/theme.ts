/**
 * Appearance = one of a few finished themes + an accent colour.
 * The theme's colours live in styles.css (`:root[data-theme=…]`); the accent sets
 * --primary, and --primary-ink (text-safe pink) is derived from it in CSS.
 * Every theme × accent pair is checked for 4.5:1 text contrast, so nothing a couple
 * picks can make the app unreadable.
 */

export const THEMES = [
  { id: "blush", name: "Blush", accent: "#FFAFCC", swatch: ["#FFF7FB", "#FFC8DD", "#CDB4DB"] },
  { id: "lilac", name: "Lilac", accent: "#CDB4DB", swatch: ["#FAF7FE", "#E8DFF5", "#C9B6E4"] },
  { id: "ocean", name: "Ocean", accent: "#A2D2FF", swatch: ["#F4F9FE", "#D6EEF8", "#A2D2FF"] },
  { id: "peach", name: "Peach", accent: "#FFB4A2", swatch: ["#FFF8F3", "#FFE0D2", "#F1C6CF"] },
  { id: "night", name: "Night", accent: "#FFAFCC", swatch: ["#1A1520", "#2E2436", "#CDB4DB"] },
] as const;

export const ACCENTS = [
  { name: "Blush", hex: "#FFAFCC" },
  { name: "Petal", hex: "#FFC8DD" },
  { name: "Orchid", hex: "#CDB4DB" },
  { name: "Sky", hex: "#A2D2FF" },
  { name: "Coral", hex: "#FFB4A2" },
  { name: "Mint", hex: "#9FDFC0" },
  { name: "Butter", hex: "#FFD98E" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type Appearance = { theme: ThemeId; accent: string };

export const DEFAULT_APPEARANCE: Appearance = { theme: "blush", accent: "#FFAFCC" };
export const THEME_STORAGE_KEY = "blublub-appearance-v3";
const OLD_STORAGE_KEY = "blublub-theme-v2";

/** Reads a saved appearance; older saved colour maps keep their main colour when it's still a valid accent. */
export function readAppearance(raw: unknown): Appearance {
  let o: unknown = raw;
  if (typeof o === "string") {
    try {
      o = JSON.parse(o);
    } catch {
      return DEFAULT_APPEARANCE;
    }
  }
  if (!o || typeof o !== "object") return DEFAULT_APPEARANCE;
  const rec = o as Record<string, unknown>;
  const theme = THEMES.find((t) => t.id === rec["theme"]) ?? THEMES[0];
  const accent = [rec["accent"], rec["main"]]
    .map((v) => (typeof v === "string" ? v.toUpperCase() : ""))
    .find((v) => ACCENTS.some((a) => a.hex === v));
  return { theme: theme.id, accent: accent ?? theme.accent };
}

export function applyAppearance(a: Appearance) {
  const root = document.documentElement;
  root.dataset["theme"] = a.theme;
  root.classList.toggle("dark", a.theme === "night");
  root.style.setProperty("--primary", a.accent);
}

export function saveAppearanceLocal(a: Appearance) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(a));
  } catch {
    /* private mode */
  }
}

export function loadAppearanceLocal(): Appearance {
  try {
    return readAppearance(
      localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem(OLD_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_APPEARANCE;
  }
}
