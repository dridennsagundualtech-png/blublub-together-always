export type ThemeMap = {
  main: string;
  soft: string;
  purple: string;
  blue: string;
  gradFrom: string;
  gradTo: string;
  boxesGradient: boolean;
  boxGradFrom: string;
  boxGradTo: string;
  /** Screen ids that use the box gradient. Empty = every screen. */
  gradientScreens: string[];
};

export const THEME_DEFAULTS: ThemeMap = {
  main: "#FFAFCC",
  soft: "#FFC8DD",
  purple: "#CDB4DB",
  blue: "#A2D2FF",
  gradFrom: "#CDB4DB",
  gradTo: "#FFAFCC",
  boxesGradient: false,
  boxGradFrom: "#FFFFFF",
  boxGradTo: "#FFC8DD",
  gradientScreens: [],
};

export const THEME_STORAGE_KEY = "blublub-theme-v2";

/** Screens the user can switch the box gradient on/off for. */
export const THEME_SCREENS: { id: string; label: string; match: string[] }[] = [
  { id: "home", label: "Home", match: ["/"] },
  { id: "chat", label: "Chat", match: ["/chat"] },
  { id: "calendar", label: "Calendar", match: ["/calendar"] },
  { id: "nest", label: "Our Nest", match: ["/nest", "/diary", "/todos", "/bucket", "/budget"] },
  { id: "games", label: "Games", match: ["/games", "/spicy"] },
  {
    id: "wellbeing",
    label: "Wellbeing",
    match: ["/wellbeing", "/cooldown", "/period", "/map", "/commitments"],
  },
  { id: "photos", label: "Memories", match: ["/photos", "/memory-book"] },
  { id: "questions", label: "Questions", match: ["/questions"] },
  { id: "more", label: "More", match: ["/more"] },
  { id: "profile", label: "Profile & settings", match: ["/profile", "/appearance"] },
];

export function screenIdForPath(pathname: string): string {
  let best = "other";
  let bestLen = 0;
  for (const s of THEME_SCREENS) {
    for (const m of s.match) {
      if (m === "/") {
        if (pathname === "/" && bestLen === 0) best = s.id;
        continue;
      }
      if ((pathname === m || pathname.startsWith(`${m}/`)) && m.length > bestLen) {
        best = s.id;
        bestLen = m.length;
      }
    }
  }
  return best;
}

export function gradientEnabledFor(map: ThemeMap, pathname: string): boolean {
  if (!map.boxesGradient) return false;
  if (!map.gradientScreens.length) return true;
  return map.gradientScreens.includes(screenIdForPath(pathname));
}

export function applyColors(map: ThemeMap, pathname?: string) {
  const root = document.documentElement;
  root.style.setProperty("--primary", map.main);
  root.style.setProperty("--ring", map.main);
  root.style.setProperty("--sidebar-primary", map.main);
  root.style.setProperty("--chart-1", map.main);

  root.style.setProperty("--petal", map.soft);
  root.style.setProperty("--peach", map.soft);
  root.style.setProperty("--secondary", map.soft);
  root.style.setProperty("--chart-5", map.soft);

  root.style.setProperty("--accent", map.purple);
  root.style.setProperty("--lavender", map.purple);
  root.style.setProperty("--sidebar-accent", map.purple);
  root.style.setProperty("--chart-2", map.purple);

  root.style.setProperty("--sky", map.blue);
  root.style.setProperty("--icy", map.blue === "#A2D2FF" ? "#BDE0FE" : map.blue);
  root.style.setProperty("--chart-3", map.blue);
  root.style.setProperty("--chart-4", map.blue === "#A2D2FF" ? "#BDE0FE" : map.blue);

  root.style.setProperty("--grad-featured-from", map.gradFrom);
  root.style.setProperty("--grad-featured-to", map.gradTo);
  root.style.setProperty("--grad-hero-from", map.gradFrom);
  root.style.setProperty("--grad-hero-to", map.gradTo);
  root.style.setProperty("--grad-panel-from", map.gradFrom);
  root.style.setProperty("--grad-panel-to", map.gradTo);

  root.style.setProperty("--box-grad-from", map.boxGradFrom || map.soft);
  root.style.setProperty("--box-grad-to", map.boxGradTo || map.main);

  const path = pathname ?? window.location.pathname;
  root.classList.toggle("boxes-gradient", gradientEnabledFor(map, path));
}

export function normalizeTheme(raw: unknown): ThemeMap {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ...THEME_DEFAULTS };
    }
  }
  if (!raw || typeof raw !== "object") return { ...THEME_DEFAULTS };
  const o = raw as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  if (!str("main")) return { ...THEME_DEFAULTS };
  const screens = o["gradientScreens"];
  return {
    main: str("main") || THEME_DEFAULTS.main,
    soft: str("soft") || THEME_DEFAULTS.soft,
    purple: str("purple") || THEME_DEFAULTS.purple,
    blue: str("blue") || THEME_DEFAULTS.blue,
    gradFrom: str("gradFrom") || str("purple") || THEME_DEFAULTS.gradFrom,
    gradTo: str("gradTo") || str("main") || THEME_DEFAULTS.gradTo,
    boxesGradient: !!o["boxesGradient"],
    boxGradFrom: str("boxGradFrom") || THEME_DEFAULTS.soft,
    boxGradTo: str("boxGradTo") || THEME_DEFAULTS.main,
    gradientScreens: Array.isArray(screens)
      ? (screens as unknown[]).filter((s): s is string => typeof s === "string")
      : [],
  };
}
