export type BoxOverride = {
  /** default = follow global theme; solid = one color; gradient = custom gradient */
  mode: "default" | "solid" | "gradient";
  solid?: string;
  gradFrom?: string;
  gradTo?: string;
};

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
  /** Per-box overrides (any screen). Key = data-theme-box id */
  boxOverrides: Record<string, BoxOverride>;
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
  boxOverrides: {},
};

export const THEME_STORAGE_KEY = "blublub-theme-v2";
export const DEV_MODE_KEY = "blublub-dev-mode";

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

export const BOX_SELECTORS = [
  ".card-soft",
  ".card-raised",
  ".card-outline",
  ".surface-quiet",
  ".grad-box",
  ".panel-dark",
  ".featured-gradient",
  "[data-theme-box]",
].join(", ");

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

  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  root.classList.toggle("boxes-gradient", gradientEnabledFor(map, path));
}

export function styleForBoxOverride(
  ov: BoxOverride | undefined,
): { backgroundImage?: string; backgroundColor?: string } | undefined {
  if (!ov || ov.mode === "default") return undefined;
  if (ov.mode === "solid" && ov.solid) {
    return {
      backgroundImage: "none",
      backgroundColor: ov.solid,
    };
  }
  if (ov.mode === "gradient") {
    const from = ov.gradFrom || "#CDB4DB";
    const to = ov.gradTo || "#FFAFCC";
    return {
      backgroundColor: "transparent",
      backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
    };
  }
  return undefined;
}

/** Apply a single override onto a DOM element. */
export function applyBoxOverrideToEl(el: HTMLElement, ov: BoxOverride | undefined) {
  if (!ov || ov.mode === "default") {
    el.style.removeProperty("background-image");
    el.style.removeProperty("background-color");
    el.removeAttribute("data-theme-overridden");
    return;
  }
  const style = styleForBoxOverride(ov);
  if (!style) return;
  if (style.backgroundImage !== undefined) el.style.backgroundImage = style.backgroundImage;
  else el.style.removeProperty("background-image");
  if (style.backgroundColor !== undefined) el.style.backgroundColor = style.backgroundColor;
  else el.style.removeProperty("background-color");
  el.setAttribute("data-theme-overridden", "1");
}

export function makeBoxId(el: HTMLElement, pathname: string): string {
  const existing = el.getAttribute("data-theme-box");
  if (existing) return existing;
  const text = (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 28);
  const cls =
    ["panel-dark", "featured-gradient", "grad-box", "card-soft", "card-raised", "surface-quiet", "card-outline"].find(
      (c) => el.classList.contains(c),
    ) || "box";
  return `${pathname}::${cls}::${text || el.tagName}`;
}

export function stampAndApplyBoxOverrides(map: ThemeMap, pathname: string) {
  if (typeof document === "undefined") return;
  const nodes = document.querySelectorAll<HTMLElement>(BOX_SELECTORS);
  nodes.forEach((el) => {
    // skip nested boxes deeper than first match when parent is already a box
    // (still allow nesting ids; overrides apply to each)
    const id = makeBoxId(el, pathname);
    el.setAttribute("data-theme-box", id);
    applyBoxOverrideToEl(el, map.boxOverrides?.[id]);
  });
}

export function normalizeTheme(raw: unknown): ThemeMap {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ...THEME_DEFAULTS, boxOverrides: {} };
    }
  }
  if (!raw || typeof raw !== "object") return { ...THEME_DEFAULTS, boxOverrides: {} };
  const o = raw as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  if (!str("main")) return { ...THEME_DEFAULTS, boxOverrides: {} };
  const screens = o["gradientScreens"];
  const overridesRaw = o["boxOverrides"];
  const boxOverrides: Record<string, BoxOverride> = {};
  if (overridesRaw && typeof overridesRaw === "object") {
    for (const [k, v] of Object.entries(overridesRaw as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const ov = v as Record<string, unknown>;
      const mode = ov.mode === "solid" || ov.mode === "gradient" || ov.mode === "default" ? ov.mode : "default";
      boxOverrides[k] = {
        mode,
        solid: typeof ov.solid === "string" ? ov.solid : undefined,
        gradFrom: typeof ov.gradFrom === "string" ? ov.gradFrom : undefined,
        gradTo: typeof ov.gradTo === "string" ? ov.gradTo : undefined,
      };
    }
  }
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
    boxOverrides,
  };
}

