export type BoxOverride = {
  /** default = follow global theme; solid = one color; gradient = custom gradient */
  mode: "default" | "solid" | "gradient";
  solid?: string;
  gradFrom?: string;
  gradTo?: string;
  /** Motion on this box only */
  anim?: "none" | "flow" | "shine";
  /** Per-box shadow: default follows global, on/off forces */
  shadow?: "default" | "on" | "off";
  /**
   * Background picture for this box (URL or data-URL).
   * When set, it covers the box and overwrites solid/gradient fill.
   */
  image?: string;
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
  /** Soft elevation on cards/tiles app-wide */
  shadowsEnabled: boolean;
  /** 0–1 strength of primary-tinted shadow */
  shadowStrength: number;
  /** Corner radius in rem (edge sharpness). Lower = sharper, higher = rounder */
  cornerRadius: number;
};

export type ThemePreset = {
  id: string;
  name: string;
  /** built-in presets cannot be deleted */
  builtin?: boolean;
  theme: ThemeMap;
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
  shadowsEnabled: true,
  shadowStrength: 0.32,
  cornerRadius: 1.25,
};

export const THEME_STORAGE_KEY = "blublub-theme-v2";
export const DEV_MODE_KEY = "blublub-dev-mode";
export const PRESETS_STORAGE_KEY = "blublub-theme-presets-v1";

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

/** Recommended built-in appearance packs */
export const BUILTIN_PRESETS: ThemePreset[] = [
  {
    id: "blush",
    name: "Blush default",
    builtin: true,
    theme: { ...THEME_DEFAULTS },
  },
  {
    id: "lilac-dream",
    name: "Lilac dream",
    builtin: true,
    theme: {
      ...THEME_DEFAULTS,
      main: "#CDB4DB",
      soft: "#E8DFF5",
      purple: "#B8A9E8",
      blue: "#C5D6FF",
      gradFrom: "#B8A9E8",
      gradTo: "#FFC8DD",
      cornerRadius: 1.5,
      shadowStrength: 0.28,
    },
  },
  {
    id: "ocean-calm",
    name: "Ocean calm",
    builtin: true,
    theme: {
      ...THEME_DEFAULTS,
      main: "#7EB8DA",
      soft: "#D6EEF8",
      purple: "#A8C5E2",
      blue: "#A2D2FF",
      gradFrom: "#A2D2FF",
      gradTo: "#BDE0FE",
      cornerRadius: 1.1,
      shadowStrength: 0.3,
    },
  },
  {
    id: "peach-warm",
    name: "Peach warm",
    builtin: true,
    theme: {
      ...THEME_DEFAULTS,
      main: "#FFB4A2",
      soft: "#FFE5D9",
      purple: "#E8B4BC",
      blue: "#FEC89A",
      gradFrom: "#FFCAD4",
      gradTo: "#FFE5D9",
      cornerRadius: 1.35,
      shadowStrength: 0.35,
    },
  },
  {
    id: "midnight-soft",
    name: "Midnight soft",
    builtin: true,
    theme: {
      ...THEME_DEFAULTS,
      main: "#9B8CFF",
      soft: "#2A2438",
      purple: "#6B5B95",
      blue: "#5B7C99",
      gradFrom: "#6B5B95",
      gradTo: "#9B8CFF",
      boxGradFrom: "#2A2438",
      boxGradTo: "#3D3555",
      cornerRadius: 1.0,
      shadowStrength: 0.4,
    },
  },
  {
    id: "sharp-minimal",
    name: "Sharp minimal",
    builtin: true,
    theme: {
      ...THEME_DEFAULTS,
      main: "#FFAFCC",
      soft: "#F5F5F5",
      purple: "#D0D0D8",
      blue: "#E0E8F0",
      gradFrom: "#E8E8EE",
      gradTo: "#FFAFCC",
      cornerRadius: 0.55,
      shadowStrength: 0.18,
      shadowsEnabled: true,
    },
  },
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

  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  root.classList.toggle("boxes-gradient", gradientEnabledFor(map, path));

  const strength = typeof map.shadowStrength === "number" ? map.shadowStrength : 0.32;
  root.style.setProperty("--shadow-strength", String(Math.min(1, Math.max(0, strength))));
  root.classList.toggle("shadows-off", map.shadowsEnabled === false);

  const radius = typeof map.cornerRadius === "number" ? map.cornerRadius : 1.25;
  const r = `${Math.min(2.5, Math.max(0.25, radius))}rem`;
  root.style.setProperty("--radius", r);
  root.style.setProperty("--card-radius", r);
  root.style.setProperty("--panel-radius", `calc(${r} + 0.4rem)`);
}

export function styleForBoxOverride(
  ov: BoxOverride | undefined,
): { backgroundImage?: string; backgroundColor?: string } | undefined {
  if (!ov || ov.mode === "default") return undefined;
  if (ov.mode === "solid" && ov.solid) {
    return { backgroundImage: "none", backgroundColor: ov.solid };
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

export function applyBoxOverrideToEl(el: HTMLElement, ov: BoxOverride | undefined) {
  el.classList.remove("gradient-flow", "gradient-shine", "box-shadow-force-on", "box-shadow-force-off", "box-has-image");

  if (!ov) {
    el.style.removeProperty("background-image");
    el.style.removeProperty("background-color");
    el.style.removeProperty("background-size");
    el.style.removeProperty("background-position");
    el.style.removeProperty("background-repeat");
    el.removeAttribute("data-theme-overridden");
    return;
  }

  const anim = ov.anim ?? "none";
  const shadow = ov.shadow ?? "default";
  const image = (ov.image || "").trim();
  const isEmpty =
    ov.mode === "default" && anim === "none" && shadow === "default" && !image;

  if (isEmpty) {
    el.style.removeProperty("background-image");
    el.style.removeProperty("background-color");
    el.style.removeProperty("background-size");
    el.style.removeProperty("background-position");
    el.style.removeProperty("background-repeat");
    el.removeAttribute("data-theme-overridden");
    return;
  }

  // Picture wins over solid / gradient
  if (image) {
    el.style.backgroundImage = `url("${image.replace(/"/g, "%22")}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundColor = "transparent";
    el.classList.add("box-has-image");
    el.setAttribute("data-theme-overridden", "1");
  } else if (ov.mode === "solid" || ov.mode === "gradient") {
    el.style.removeProperty("background-size");
    el.style.removeProperty("background-position");
    el.style.removeProperty("background-repeat");
    const style = styleForBoxOverride(ov);
    if (style) {
      if (style.backgroundImage !== undefined) el.style.backgroundImage = style.backgroundImage;
      else el.style.removeProperty("background-image");
      if (style.backgroundColor !== undefined) el.style.backgroundColor = style.backgroundColor;
      else el.style.removeProperty("background-color");
      el.setAttribute("data-theme-overridden", "1");
    }
  } else {
    el.style.removeProperty("background-image");
    el.style.removeProperty("background-color");
    el.style.removeProperty("background-size");
    el.style.removeProperty("background-position");
    el.style.removeProperty("background-repeat");
    el.removeAttribute("data-theme-overridden");
  }

  if (!image && ov.anim === "flow") {
    el.classList.add("gradient-flow");
    if (!el.style.backgroundImage || el.style.backgroundImage === "none") {
      el.style.backgroundImage =
        "linear-gradient(125deg, var(--grad-featured-from), var(--grad-featured-to), var(--grad-featured-from))";
    }
  } else if (!image && ov.anim === "shine") {
    el.classList.add("gradient-shine");
  }

  if (shadow === "on") el.classList.add("box-shadow-force-on");
  if (shadow === "off") el.classList.add("box-shadow-force-off");
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
  const boxOverrides: Record<string, BoxOverride> = {};
  if (o["boxOverrides"] && typeof o["boxOverrides"] === "object") {
    for (const [k, v] of Object.entries(o["boxOverrides"] as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const ov = v as Record<string, unknown>;
      const mode = ov["mode"] === "solid" || ov["mode"] === "gradient" || ov["mode"] === "default" ? ov["mode"] : "default";
      const anim =
        ov["anim"] === "flow" || ov["anim"] === "shine" || ov["anim"] === "none" ? ov["anim"] : "none";
      const shadow =
        ov["shadow"] === "on" || ov["shadow"] === "off" || ov["shadow"] === "default" ? ov["shadow"] : "default";
      boxOverrides[k] = {
        mode,
        ...(typeof ov["solid"] === "string" ? { solid: ov["solid"] } : {}),
        ...(typeof ov["gradFrom"] === "string" ? { gradFrom: ov["gradFrom"] } : {}),
        ...(typeof ov["gradTo"] === "string" ? { gradTo: ov["gradTo"] } : {}),
        anim,
        shadow,
        ...(typeof ov["image"] === "string" && ov["image"].trim()
          ? { image: ov["image"].trim() }
          : {}),
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
    shadowsEnabled: o["shadowsEnabled"] === false ? false : true,
    shadowStrength:
      typeof o["shadowStrength"] === "number"
        ? Math.min(1, Math.max(0, o["shadowStrength"] as number))
        : THEME_DEFAULTS.shadowStrength,
    cornerRadius:
      typeof o["cornerRadius"] === "number"
        ? Math.min(2.5, Math.max(0.25, o["cornerRadius"] as number))
        : THEME_DEFAULTS.cornerRadius,
  };
}

export function loadUserPresets(): ThemePreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is ThemePreset => !!p && typeof p === "object" && typeof (p as ThemePreset).id === "string")
      .map((p) => ({
        id: p.id,
        name: String(p.name || "My preset"),
        builtin: false,
        theme: normalizeTheme(p.theme),
      }));
  } catch {
    return [];
  }
}

export function saveUserPresets(list: ThemePreset[]) {
  const custom = list.filter((p) => !p.builtin).map((p) => ({
    id: p.id,
    name: p.name,
    theme: p.theme,
  }));
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(custom));
}

export function allPresets(): ThemePreset[] {
  return [...BUILTIN_PRESETS, ...loadUserPresets()];
}
