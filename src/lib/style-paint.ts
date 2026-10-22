/**
 * The app styles (skins.css) painted on a canvas, shared by the Look Back slides, the saved video
 * and the PDF book: each style's background, text cards and photo frames. A style's own pictures
 * (paper grain, gear, tree, grass, wind) are read from skins.css, so the canvas and the app match.
 * `u` is one "phone pixel" (1 on a 360-wide slide).
 */
import { critterSrc, type Critter, type Pose } from "@/components/Doodles";
import type { SkinId } from "@/lib/theme";

export type RGB = [number, number, number];
export const rgba = ([r, g, b]: RGB, a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`;

const WHITE: RGB = [255, 255, 255];
const BROWN: RGB = [59, 42, 26];
const SEPIA: RGB = [58, 42, 23];
const ICE: RGB = [234, 246, 255];
const NEON_BLUE = "#6ee8ff";
const NEON_PURPLE = "#c59cff";
const BRASS = { light: "#e9d29a", mid: "#b08d57", dark: "#7a5a2b" };
const KRAFT = "#d6b994";
const PARCHMENT = "#f1e2c2";
const CREAM = "#fbf3e3";
const MOSS = "rgba(111, 154, 106, 0.45)";

/** The app style things are drawn in: which style, fonts, colours, critters and pictures. */
export type Look = {
  skin: SkinId;
  pixel: boolean;
  display: string;
  body: string;
  primary: string;
  deep: string;
  soft: [string, string];
  /** Light tints of the main colours, for printed pages. */
  wash: [string, string];
  lavender: string;
  sky: string;
  card: string;
  background: string;
  ink: RGB;
  critters: Map<string, CanvasImageSource>;
  art: Partial<Record<"paper" | "gear" | "tree" | "grass" | "wind", HTMLImageElement>>;
};

/** How a style lays text and photos on its background. */
export type Traits = {
  /** Text colour straight on the background. */
  text: RGB;
  /** Text sits on the style's card (paper note, frosted glass, neon panel…). */
  panel: boolean;
  panelText: RGB;
  /** Photos lie on the style's background (paper, parchment, meadow), not on a blurred copy. */
  photoOnStage: boolean;
  /** Neon glow around text. */
  glow: string | null;
  /** Text colour on a printed book page. */
  page: RGB;
};

export function traits(look: Look): Traits {
  const base: Traits = {
    text: WHITE,
    panel: false,
    panelText: WHITE,
    photoOnStage: false,
    glow: null,
    page: look.ink,
  };
  switch (look.skin) {
    case "jelly":
      return { ...base, panel: true };
    case "glass":
      return { ...base, text: look.ink, panel: true, panelText: look.ink };
    case "scrapbook":
      return {
        ...base,
        text: BROWN,
        panel: true,
        panelText: BROWN,
        photoOnStage: true,
        page: BROWN,
      };
    case "steampunk":
      return {
        ...base,
        text: SEPIA,
        panel: true,
        panelText: SEPIA,
        photoOnStage: true,
        page: SEPIA,
      };
    case "nature":
      return { ...base, text: look.ink, panel: true, panelText: look.ink, photoOnStage: true };
    case "cyberpunk":
      return { ...base, text: ICE, panel: true, panelText: ICE, glow: NEON_BLUE, page: ICE };
    default:
      return base;
  }
}

// ── Reading the style from the page ─────────────────────────────────────

const CRITTERS: [Critter, Pose][] = [
  ["cat", "cheer"],
  ["seal", "love"],
  ["penguin", "curious"],
  ["cat", "wave"],
  ["penguin", "love"],
];

/** Which skins.css pictures each style uses, in the order they're listed there. */
const ART: Partial<Record<SkinId, [pseudo: string | null, names: (keyof Look["art"])[]][]>> = {
  scrapbook: [[null, ["paper"]]],
  steampunk: [[null, ["gear", "paper"]]],
  nature: [
    ["::before", ["tree", "grass"]],
    ["::after", ["wind"]],
  ],
};

export const canvasOf = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/** Any CSS colour (var(), color-mix…) as rgb() the canvas understands. */
function color(css: string) {
  const el = document.createElement("div");
  el.style.cssText = `position:absolute;visibility:hidden;background:${css}`;
  document.body.append(el);
  const computed = getComputedStyle(el).backgroundColor;
  el.remove();
  const ctx = canvasOf(1, 1).getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

const rgbOf = (c: string): RGB => {
  const [r = 0, g = 0, b = 0] = (c.match(/\d+/g) ?? []).map(Number);
  return [r, g, b];
};

function fontOf(tag: string, className: string) {
  const el = document.createElement(tag);
  el.className = className;
  el.style.cssText = "position:absolute;visibility:hidden";
  document.body.append(el);
  const family = getComputedStyle(el).fontFamily;
  el.remove();
  return family;
}

async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** The url(...) images of an element's background, in order. */
function cssUrls(el: Element, pseudo: string | null) {
  const bg = getComputedStyle(el, pseudo).backgroundImage;
  return [...bg.matchAll(/url\("((?:[^"\\]|\\.)*)"\)/g)].map((m) => m[1]!.replace(/\\(.)/g, "$1"));
}

/** Reads the current app style (and waits for its fonts and pictures) so drawings match the app. */
export async function prepareLook(): Promise<Look> {
  const skin = (document.documentElement.dataset["skin"] ?? "classic") as SkinId;
  const display = fontOf("h2", "font-display");
  const body = fontOf("p", "");
  const look: Look = {
    skin,
    pixel: skin === "pixel",
    display,
    body,
    primary: color("var(--color-primary)"),
    deep: color("color-mix(in oklab, var(--color-primary) 45%, black)"),
    soft: [
      color("color-mix(in oklab, var(--color-primary) 70%, black)"),
      color("color-mix(in oklab, var(--color-primary) 35%, black)"),
    ],
    wash: [
      color("color-mix(in oklab, var(--color-primary) 18%, white)"),
      color("color-mix(in oklab, var(--color-lavender) 22%, white)"),
    ],
    lavender: color("var(--color-lavender)"),
    sky: color("var(--color-sky)"),
    card: color("var(--color-card)"),
    background: color("var(--color-background)"),
    ink: rgbOf(color("var(--color-foreground)")),
    critters: new Map(),
    art: {},
  };
  const wash = document.querySelector(".page-wash");
  const art = wash
    ? (ART[skin] ?? []).flatMap(([pseudo, names]) => {
        const urls = cssUrls(wash, pseudo);
        return names.map((name, i) => [name, urls[i]] as const);
      })
    : [];
  await Promise.all([
    ...["800", "700", "600"].flatMap((w) =>
      [display, body].map((f) => document.fonts.load(`${w} 32px ${f}`, "Aa1💗").catch(() => [])),
    ),
    ...(look.pixel
      ? []
      : CRITTERS.map(async ([c, p]) => {
          look.critters.set(`${c}-${p}`, await loadImage(critterSrc(c, p)));
        })),
    ...art.map(async ([name, url]) => {
      const img = url ? await loadImage(url).catch(() => null) : null;
      if (img) look.art[name] = img;
    }),
  ]);
  return look;
}

// ── Small helpers ───────────────────────────────────────────────────────

export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | number[],
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** linear-gradient(160deg, from, to) over a w×h box, like the app's CSS. */
function gradient160(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  from: string,
  to: string,
) {
  const a = (160 * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const g = ctx.createLinearGradient(
    w / 2 - (dx * len) / 2,
    h / 2 - (dy * len) / 2,
    w / 2 + (dx * len) / 2,
    h / 2 + (dy * len) / 2,
  );
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

const withAlpha = (c: string, a: number) => rgba(rgbOf(c), a);

function rivet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x - r / 3, y - r / 3, 0, x, y, r);
  g.addColorStop(0, BRASS.light);
  g.addColorStop(0.6, BRASS.mid);
  g.addColorStop(1, BRASS.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Striped fabric for the scrapbook photo corners: three ribbons, like a box of mixed corners.
// Each tile is one stripe period wide, so it repeats seamlessly at 45°.
const RIBBONS = (look: Look): [string, number][][] => [
  [
    [look.primary, 3],
    ["#fff8ec", 2],
    ["#3b2a1a", 1],
    [look.primary, 3],
    ["#f2c14e", 2],
  ],
  [
    [look.lavender, 3],
    ["#fff8ec", 2],
    [look.sky, 3],
    ["#fff8ec", 2],
  ],
  [
    ["#c9a27a", 4],
    ["#a57d55", 1],
    ["#d8b994", 4],
  ],
];
const ribbonCache = new WeakMap<Look, HTMLCanvasElement[]>();
function ribbon(look: Look, seed: number) {
  let tiles = ribbonCache.get(look);
  if (!tiles) {
    tiles = RIBBONS(look).map((bands) => {
      const p = bands.reduce((n, [, w]) => n + w, 0);
      const tile = canvasOf(p, p);
      const c = tile.getContext("2d")!;
      for (const o of [-2 * p, -p, 0, p, 2 * p]) {
        let d = o;
        for (const [fill, w] of bands) {
          c.fillStyle = fill;
          c.beginPath();
          c.moveTo(d, 0);
          c.lineTo(d + w, 0);
          c.lineTo(d + w - 3 * p, 3 * p);
          c.lineTo(d - 3 * p, 3 * p);
          c.fill();
          d += w;
        }
      }
      return tile;
    });
    ribbonCache.set(look, tiles);
  }
  return tiles[Math.abs(seed) % tiles.length]!;
}

/** Four striped photo corners holding a rectangle down. */
function photoCorners(
  ctx: CanvasRenderingContext2D,
  look: Look,
  x: number,
  y: number,
  w: number,
  h: number,
  size: number,
  u: number,
  seed: number,
) {
  const o = 2 * u;
  ctx.save();
  ctx.fillStyle = ctx.createPattern(ribbon(look, seed), "repeat")!;
  ctx.shadowColor = "rgba(59, 42, 26, 0.25)";
  ctx.shadowBlur = 2 * u;
  ctx.shadowOffsetY = u;
  const tri = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.fill();
  };
  tri(x - o, y - o, x + size, y - o, x - o, y + size);
  tri(x + w + o, y - o, x + w - size, y - o, x + w + o, y + size);
  tri(x - o, y + h + o, x + size, y + h + o, x - o, y + h - size);
  tri(x + w + o, y + h + o, x + w - size, y + h + o, x + w + o, y + h - size);
  ctx.restore();
}

/** A tuft of grass with a flower, growing on top of an edge (as on the Nature cards). */
function tuft(ctx: CanvasRenderingContext2D, x: number, y: number, u: number) {
  ctx.save();
  ctx.translate(x, y - 16 * u);
  ctx.scale(u, u);
  ctx.lineCap = "round";
  ctx.strokeStyle = "#5f8a58";
  ctx.lineWidth = 1.6;
  ctx.stroke(
    new Path2D(
      "M6 18q1-8 4-13M10 18q0-6-3-10M14 18q2-9 6-14M19 18q-1-6-4-9M24 18q1-7 4-11M30 18q1-9 5-13M34 18q-1-6-4-9",
    ),
  );
  ctx.lineWidth = 1.2;
  ctx.stroke(new Path2D("M38 18v-9"));
  ctx.fillStyle = "#f4a6c1";
  ctx.beginPath();
  ctx.arc(38, 7, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6d365";
  ctx.beginPath();
  ctx.arc(38, 7, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Backgrounds ─────────────────────────────────────────────────────────

/** Paper colour with the style's grain on top. */
function paper(ctx: CanvasRenderingContext2D, look: Look, w: number, h: number, base: string) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  if (look.art.paper) {
    ctx.fillStyle = ctx.createPattern(look.art.paper, "repeat")!;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Night city: glows, and a glowing grid floor rolling towards you (a calm grid on book pages). */
function night(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  u: number,
  page: boolean,
) {
  ctx.fillStyle = "#070b1d";
  ctx.fillRect(0, 0, w, h);
  for (const [x, y, r, c, a] of [
    [0, 0, w * 1.2, NEON_PURPLE, 0.24],
    [w, h, w * 1.1, NEON_BLUE, 0.2],
  ] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(c, a));
    g.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (page) {
    ctx.strokeStyle = withAlpha(NEON_BLUE, 0.06);
    ctx.lineWidth = u * 0.6;
    ctx.beginPath();
    for (let x = 0; x < w; x += 20 * u) ctx.rect(x, -1, 0, h + 2);
    for (let y = 0; y < h; y += 20 * u) ctx.rect(-1, y, w + 2, 0);
    ctx.stroke();
    return;
  }
  const hz = h * 0.7;
  ctx.lineWidth = u;
  ctx.strokeStyle = withAlpha(NEON_BLUE, 0.16);
  ctx.beginPath();
  for (let i = -10; i <= 10; i++) {
    ctx.moveTo(w / 2 + i * 10 * u, hz);
    ctx.lineTo(w / 2 + i * 70 * u, h);
  }
  ctx.stroke();
  const phase = ((t / 1000) * 0.35) % 1;
  for (let k = 0; k < 10; k++) {
    const p = (k + phase) / 10;
    const y = hz + (h - hz) * p * p;
    ctx.strokeStyle = withAlpha(NEON_BLUE, 0.05 + 0.22 * p);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const glow = ctx.createLinearGradient(0, hz - 14 * u, 0, hz + 14 * u);
  glow.addColorStop(0, withAlpha(NEON_PURPLE, 0));
  glow.addColorStop(0.5, withAlpha(NEON_PURPLE, 0.45));
  glow.addColorStop(1, withAlpha(NEON_PURPLE, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, hz - 14 * u, w, 28 * u);
}

/** The Nature scene: a soft sky, wind drifting by, a tree with its roots, grass hills and flowers. */
function meadow(
  ctx: CanvasRenderingContext2D,
  look: Look,
  w: number,
  h: number,
  t: number,
  u: number,
  page: boolean,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, look.background);
  sky.addColorStop(0.55, look.background);
  sky.addColorStop(1, "#e4efd9");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const k = u * (page ? 0.5 : 0.8);
  const { grass, tree, wind } = look.art;
  if (grass) {
    for (let x = 0; x < w; x += 240 * k) ctx.drawImage(grass, x, h - 180 * k, 240 * k, 180 * k);
  }
  if (tree) {
    const kt = k * 0.9;
    const ground = h - 140 * k;
    ctx.globalAlpha = page ? 0.55 : 1; // on a book page the tree stays behind the text
    ctx.drawImage(tree, w - 200 * kt - 6 * u, ground - 200 * kt, 200 * kt, 300 * kt);
    ctx.globalAlpha = 1;
  }
  if (wind) {
    const tw = 320 * u;
    const th = 220 * u;
    const off = page ? 0 : ((t / 30000) * tw) % tw;
    for (let y = 0; y < h; y += th) {
      for (let x = off - tw; x < w; x += tw) ctx.drawImage(wind, x, y, tw, th);
    }
  }
}

/** Glossy bubbles floating up (Jelly). */
function bubbles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  u: number,
  page: boolean,
) {
  for (let i = 0; i < 7; i++) {
    const r = (26 + ((i * 17) % 40)) * u;
    const x = (((i * 53) % 100) / 100) * w;
    const speed = (10 + i * 3) * u;
    const y = h + r - (((t / 1000) * speed + i * 137 * u) % (h + 2 * r));
    ctx.fillStyle = page ? "rgba(255, 255, 255, 0.55)" : "rgba(255, 255, 255, 0.13)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.34, r * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Fills 0,0 → w,h with the style's background. `soft` is the quieter colour (diary slides);
 * `page` is the lighter version used for printed book pages.
 */
export function paintStage(
  ctx: CanvasRenderingContext2D,
  look: Look,
  w: number,
  h: number,
  t: number,
  { soft = false, page = false }: { soft?: boolean; page?: boolean } = {},
) {
  const u = w / 360;
  switch (look.skin) {
    case "scrapbook":
      return paper(ctx, look, w, h, KRAFT);
    case "steampunk": {
      paper(ctx, look, w, h, PARCHMENT);
      const v = ctx.createRadialGradient(
        w / 2,
        h * 0.4,
        Math.min(w, h) * 0.45,
        w / 2,
        h * 0.4,
        Math.max(w, h) * 0.8,
      );
      v.addColorStop(0, "rgba(90, 61, 22, 0)");
      v.addColorStop(1, "rgba(90, 61, 22, 0.22)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      if (look.art.gear) {
        const s = 230 * u;
        ctx.save();
        ctx.translate(w - s * 0.28, h - s * 0.32);
        ctx.rotate(page ? 0 : (t / 1000) * 0.08);
        ctx.drawImage(look.art.gear, -s / 2, -s / 2, s, s);
        ctx.drawImage(look.art.gear, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, BRASS.light);
      g.addColorStop(0.5, BRASS.mid);
      g.addColorStop(1, BRASS.dark);
      ctx.strokeStyle = g;
      ctx.lineWidth = 3 * u;
      ctx.strokeRect(8 * u, 8 * u, w - 16 * u, h - 16 * u);
      ctx.strokeStyle = withAlpha(BRASS.dark, 0.45);
      ctx.lineWidth = u;
      ctx.strokeRect(13 * u, 13 * u, w - 26 * u, h - 26 * u);
      for (const [x, y] of [
        [14, 14],
        [w / u - 14, 14],
        [14, h / u - 14],
        [w / u - 14, h / u - 14],
      ] as const) {
        rivet(ctx, x * u, y * u, 3.4 * u);
      }
      return;
    }
    case "nature":
      return meadow(ctx, look, w, h, t, u, page);
    case "cyberpunk":
      return night(ctx, w, h, t, u, page);
    case "glass": {
      ctx.fillStyle = look.background;
      ctx.fillRect(0, 0, w, h);
      const blobs: [number, number, number, string][] = [
        [0.12, 0.08, 0.55, look.primary],
        [0.92, 0.24, 0.6, look.lavender],
        [0.22, 0.62, 0.65, look.sky],
        [0.88, 0.9, 0.6, look.primary],
      ];
      blobs.forEach(([bx, by, br, c], i) => {
        const x = (bx + (page ? 0 : 0.03 * Math.sin(t / 4000 + i))) * w;
        const y = (by + (page ? 0 : 0.02 * Math.cos(t / 5000 + i))) * h;
        const g = ctx.createRadialGradient(x, y, 0, x, y, br * w);
        g.addColorStop(0, withAlpha(c, page ? 0.35 : 0.7));
        g.addColorStop(1, withAlpha(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
      return;
    }
    case "jelly": {
      const [from, to] = page ? look.wash : soft ? look.soft : [look.primary, look.deep];
      gradient160(ctx, w, h, from, to);
      return bubbles(ctx, w, h, page ? 0 : t, u, page);
    }
    default: {
      if (page) {
        ctx.fillStyle = "#fffbfd";
        ctx.fillRect(0, 0, w, h);
      } else {
        const [from, to] = soft ? look.soft : [look.primary, look.deep];
        gradient160(ctx, w, h, from, to);
      }
      if (look.pixel) {
        ctx.strokeStyle = page ? "rgba(63, 42, 58, 0.05)" : "rgba(255, 255, 255, 0.07)";
        ctx.lineWidth = u;
        ctx.beginPath();
        for (let x = 0; x < w; x += 12 * u) ctx.rect(x, -1, 0, h + 2);
        for (let y = 0; y < h; y += 12 * u) ctx.rect(-1, y, w + 2, 0);
        ctx.stroke();
      }
    }
  }
}

/** Anything the style lays over the finished picture (Cyberpunk's scanlines). */
export function paintOverlay(ctx: CanvasRenderingContext2D, look: Look, w: number, h: number) {
  if (look.skin !== "cyberpunk") return;
  const u = w / 360;
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  for (let y = 0; y < h; y += 3 * u) ctx.fillRect(0, y, w, u);
}

// ── Cards and photo frames ──────────────────────────────────────────────

/** The style's card behind text: paper note, frosted glass, neon panel, brass plate, stone… */
export function paintPanel(
  ctx: CanvasRenderingContext2D,
  look: Look,
  x: number,
  y: number,
  w: number,
  h: number,
  { seed = 0, u = 1 }: { seed?: number; u?: number } = {},
) {
  ctx.save();
  switch (look.skin) {
    case "jelly": {
      roundRect(ctx, x, y, w, h, 28 * u);
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 2 * u;
      ctx.stroke();
      ctx.clip();
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.ellipse(x + w * 0.3, y + 10 * u, w * 0.32, 9 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "glass": {
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowBlur = 24 * u;
      ctx.shadowOffsetY = 8 * u;
      roundRect(ctx, x, y, w, h, 22 * u);
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5 * u;
      ctx.stroke();
      break;
    }
    case "scrapbook": {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((seed % 2 ? 1 : -1) * 0.014);
      ctx.translate(-(x + w / 2), -(y + h / 2));
      ctx.shadowColor = "rgba(59, 42, 26, 0.35)";
      ctx.shadowBlur = 14 * u;
      ctx.shadowOffsetY = 6 * u;
      ctx.fillStyle = CREAM;
      ctx.fillRect(x, y, w, h);
      ctx.shadowColor = "transparent";
      photoCorners(ctx, look, x, y, w, h, 24 * u, u, seed);
      break;
    }
    case "cyberpunk": {
      ctx.shadowColor = NEON_BLUE;
      ctx.shadowBlur = 18 * u;
      roundRect(ctx, x, y, w, h, 14 * u);
      ctx.fillStyle = "rgba(13, 19, 48, 0.9)";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = withAlpha(NEON_BLUE, 0.65);
      ctx.lineWidth = 1.5 * u;
      ctx.stroke();
      break;
    }
    case "steampunk": {
      ctx.shadowColor = "rgba(58, 42, 23, 0.3)";
      ctx.shadowBlur = 10 * u;
      ctx.shadowOffsetY = 4 * u;
      roundRect(ctx, x, y, w, h, 4 * u);
      ctx.fillStyle = "#f8edd2";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = BRASS.mid;
      ctx.lineWidth = 3 * u;
      ctx.stroke();
      ctx.strokeStyle = withAlpha(BRASS.light, 0.7);
      ctx.lineWidth = u;
      ctx.strokeRect(x + 5 * u, y + 5 * u, w - 10 * u, h - 10 * u);
      for (const [rx, ry] of [
        [x + 9 * u, y + 9 * u],
        [x + w - 9 * u, y + 9 * u],
        [x + 9 * u, y + h - 9 * u],
        [x + w - 9 * u, y + h - 9 * u],
      ] as const) {
        rivet(ctx, rx, ry, 2.8 * u);
      }
      break;
    }
    case "nature": {
      ctx.shadowColor = "rgba(47, 74, 44, 0.25)";
      ctx.shadowBlur = 22 * u;
      ctx.shadowOffsetY = 10 * u;
      roundRect(ctx, x, y, w, h, [26 * u, 18 * u, 24 * u, 16 * u]);
      ctx.fillStyle = look.card;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = MOSS;
      ctx.lineWidth = u;
      ctx.stroke();
      tuft(ctx, seed % 2 ? x + w - 66 * u : x + 20 * u, y, u);
      break;
    }
  }
  ctx.restore();
}

/** A photo in the style's frame at x,y,w,h. `top` marks the most-loved memory. */
export function paintPhoto(
  ctx: CanvasRenderingContext2D,
  look: Look,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  { seed = 0, u = 1, top = false }: { seed?: number; u?: number; top?: boolean } = {},
) {
  ctx.save();
  let ring: number | number[] | null = null;
  switch (look.skin) {
    case "scrapbook": {
      // A print with a white border, glued down a little crooked, held by photo corners.
      const b = 10 * u;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(((Math.abs(seed) % 5) - 2) * 0.012);
      ctx.translate(-(x + w / 2), -(y + h / 2));
      ctx.shadowColor = "rgba(59, 42, 26, 0.35)";
      ctx.shadowBlur = 14 * u;
      ctx.shadowOffsetY = 6 * u;
      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(x - b, y - b, w + 2 * b, h + 2 * b);
      ctx.shadowColor = "transparent";
      ctx.drawImage(img, x, y, w, h);
      photoCorners(ctx, look, x - b, y - b, w + 2 * b, h + 2 * b, 28 * u, u, seed);
      break;
    }
    case "steampunk": {
      const b = 10 * u;
      ctx.shadowColor = "rgba(58, 42, 23, 0.4)";
      ctx.shadowBlur = 16 * u;
      ctx.shadowOffsetY = 6 * u;
      const g = ctx.createLinearGradient(x - b, y - b, x + w + b, y + h + b);
      g.addColorStop(0, BRASS.light);
      g.addColorStop(0.5, BRASS.mid);
      g.addColorStop(1, BRASS.dark);
      ctx.fillStyle = g;
      ctx.fillRect(x - b, y - b, w + 2 * b, h + 2 * b);
      ctx.shadowColor = "transparent";
      ctx.drawImage(img, x, y, w, h);
      ctx.strokeStyle = BRASS.dark;
      ctx.lineWidth = 1.5 * u;
      ctx.strokeRect(x, y, w, h);
      for (const [rx, ry] of [
        [x - b / 2, y - b / 2],
        [x + w + b / 2, y - b / 2],
        [x - b / 2, y + h + b / 2],
        [x + w + b / 2, y + h + b / 2],
      ] as const) {
        rivet(ctx, rx, ry, 2.8 * u);
      }
      break;
    }
    case "cyberpunk": {
      const r = 12 * u;
      ctx.shadowColor = NEON_BLUE;
      ctx.shadowBlur = 22 * u;
      roundRect(ctx, x, y, w, h, r);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.save();
      ctx.clip();
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, NEON_BLUE);
      g.addColorStop(1, NEON_PURPLE);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.5 * u;
      roundRect(ctx, x, y, w, h, r);
      ctx.stroke();
      if (top) ring = r;
      break;
    }
    case "nature": {
      const r = [26 * u, 18 * u, 24 * u, 16 * u];
      ctx.shadowColor = "rgba(47, 74, 44, 0.3)";
      ctx.shadowBlur = 26 * u;
      ctx.shadowOffsetY = 12 * u;
      roundRect(ctx, x, y, w, h, r);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.save();
      ctx.clip();
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
      ctx.strokeStyle = MOSS;
      ctx.lineWidth = 2 * u;
      ctx.stroke();
      tuft(ctx, x + 22 * u, y, u * 1.2);
      break;
    }
    default: {
      // Classic, Pixel, Jelly and Glass: a rounded photo with a soft shadow (square in Pixel).
      const r = look.pixel
        ? 0
        : look.skin === "jelly"
          ? 28 * u
          : look.skin === "glass"
            ? 20 * u
            : 16 * u;
      ctx.shadowColor =
        look.skin === "jelly" ? withAlpha(look.primary, 0.5) : "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = (look.pixel ? 0 : 40) * u;
      ctx.shadowOffsetY = (look.pixel ? 0 : 18) * u;
      roundRect(ctx, x, y, w, h, r);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.save();
      ctx.clip();
      ctx.drawImage(img, x, y, w, h);
      if (look.skin === "jelly") {
        const g = ctx.createLinearGradient(0, y, 0, y + h * 0.35);
        g.addColorStop(0, "rgba(255, 255, 255, 0.35)");
        g.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h * 0.35);
      }
      ctx.restore();
      if (look.pixel) {
        ctx.strokeStyle = "#2b2233";
        ctx.lineWidth = 3 * u;
        ctx.strokeRect(x - 1.5 * u, y - 1.5 * u, w + 3 * u, h + 3 * u);
      } else if (look.skin === "jelly" || look.skin === "glass") {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 3 * u;
        ctx.stroke();
      }
      if (top) ring = r;
    }
  }
  if (ring !== null) {
    roundRect(ctx, x - 4 * u, y - 4 * u, w + 8 * u, h + 8 * u, ring);
    ctx.strokeStyle = look.skin === "cyberpunk" ? NEON_PURPLE : "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 4 * u;
    ctx.stroke();
  }
  ctx.restore();
}

/** Text colour for names on the style's card (answer bubbles). */
export const accentOnPanel = (look: Look) =>
  look.skin === "cyberpunk"
    ? NEON_PURPLE
    : look.skin === "jelly"
      ? "rgba(255, 255, 255, 0.85)"
      : look.deep;
