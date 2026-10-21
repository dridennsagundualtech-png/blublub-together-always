/**
 * Draws Look Back slides on a canvas. The player shows these frames and the saved video is
 * made of the same frames, so what you watch is what you get. Sizes are in a 360×640 frame
 * (a phone screen in CSS pixels) and scale to any canvas size.
 */
import { critterSrc, pixelRuns, type Critter, type Pose } from "@/components/Doodles";
import { emojiRuns } from "@/components/pixel-art";
import { mapLimit, wrap } from "@/lib/memory-book";
import { SLIDE_MS, type Slide } from "@/lib/lookback-story";

export const W = 360;
export const H = 640;
const FADE_MS = 300;
const INK = "#2b2233";
const PAD = 28;

/** The app style the slides are drawn in: fonts, colours and critters. */
export type Look = {
  pixel: boolean;
  display: string;
  body: string;
  primary: string;
  deep: string;
  soft: [string, string];
  critters: Map<string, CanvasImageSource>;
};
export type Picture = { img: HTMLCanvasElement; blur: HTMLCanvasElement };
export type Pictures = Map<string, Picture>;

const CRITTERS: [Critter, Pose][] = [
  ["cat", "cheer"],
  ["seal", "love"],
  ["penguin", "curious"],
  ["cat", "wave"],
  ["penguin", "love"],
];

const canvasOf = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/** Any CSS colour (var(), color-mix…) as rgb() the canvas understands. */
function resolveColor(css: string) {
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

/** Reads the current app style (and waits for its fonts) so the slides match the app. */
export async function prepareLook(): Promise<Look> {
  const display = fontOf("h2", "font-display");
  const body = fontOf("p", "");
  const look: Look = {
    pixel: document.documentElement.dataset["skin"] === "pixel",
    display,
    body,
    primary: resolveColor("var(--color-primary)"),
    deep: resolveColor("color-mix(in oklab, var(--color-primary) 45%, black)"),
    soft: [
      resolveColor("color-mix(in oklab, var(--color-primary) 70%, black)"),
      resolveColor("color-mix(in oklab, var(--color-primary) 35%, black)"),
    ],
    critters: new Map(),
  };
  await Promise.all([
    ...["800", "700", "600"].flatMap((w) =>
      [display, body].map((f) => document.fonts.load(`${w} 32px ${f}`, "Aa1💗").catch(() => [])),
    ),
    ...(look.pixel
      ? []
      : CRITTERS.map(async ([c, p]) => {
          look.critters.set(`${c}-${p}`, await loadImage(critterSrc(c, p)));
        })),
  ]);
  return look;
}

/** Fetches a photo, shrinks it (longest side 900px) and makes its soft blurred background.
 *  ponytail: every picture stays in memory for the video; decode on demand if long stories run out. */
export async function loadPicture(url: string): Promise<Picture> {
  const bitmap = await createImageBitmap(await (await fetch(url)).blob());
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const img = canvasOf(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  img.getContext("2d")!.drawImage(bitmap, 0, 0, img.width, img.height);
  bitmap.close();

  const blur = canvasOf(180, 320);
  const b = blur.getContext("2d")!;
  if (typeof b.filter === "string") {
    b.filter = "blur(20px)";
    drawCover(b, img, -20, -20, 220, 360);
  } else {
    // No canvas blur (older Safari): shrinking to a few pixels and stretching back up blurs it too.
    const tiny = canvasOf(18, 32);
    drawCover(tiny.getContext("2d")!, img, 0, 0, 18, 32);
    b.imageSmoothingQuality = "high";
    b.drawImage(tiny, 0, 0, 180, 320);
  }
  return { img, blur };
}

/** Every picture a story needs, a few at a time. */
export async function loadPictures(
  slides: Slide[],
  onProgress?: (done: number, total: number) => void,
) {
  const urls = [...new Set(slides.map(pictureOf).filter((u): u is string => !!u))];
  const pics: Pictures = new Map();
  let done = 0;
  await mapLimit(urls, 4, async (url) => {
    try {
      pics.set(url, await loadPicture(url));
    } catch {
      /* a photo that won't load is drawn as plain colour */
    }
    onProgress?.(++done, urls.length);
  });
  return pics;
}

export const pictureOf = (s: Slide) =>
  s.kind === "photo" || s.kind === "top" ? s.photo.url : "cover" in s ? s.cover : null;

const niceDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** What a slide says, for screen readers (the canvas itself is just a picture). */
export function slideText(s: Slide): string {
  switch (s.kind) {
    case "intro":
      return `Your story: ${s.names.join(" & ")}, ${s.range}`;
    case "days":
      return `Today is day ${s.days.toLocaleString()} of us. Together since ${s.since}`;
    case "chapter":
      return `${s.month} ${s.year}, ${s.memories} memories`;
    case "photo":
      return `${s.photo.caption ?? "Photo"}, ${niceDate(s.photo.date)}`;
    case "top":
      return `Your most-loved memory: ${s.photo.caption ?? "photo"}, ${niceDate(s.photo.date)}`;
    case "diary":
      return `From the diary, ${s.entry.who}: ${s.entry.title ?? ""} ${s.entry.body}`;
    case "question":
      return `You both answered: ${s.question.prompt} ${s.question.answers.map((a) => `${a.who}: ${a.body}`).join(". ")}`;
    case "numbers":
      return `In numbers: ${s.items.map((i) => `${i.value} ${i.label}`).join(", ")}`;
    case "outro":
      return `Here's to more of us, ${s.names.join(" & ")}`;
  }
}

// ── Motion ──────────────────────────────────────────────────────────────

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const outQuart = (p: number) => 1 - (1 - p) ** 4;
const outCubic = (p: number) => 1 - (1 - p) ** 3;
const outBack = (p: number) => 1 + 2.6 * (p - 1) ** 3 + 1.6 * (p - 1) ** 2;

/** Text rising 18px into place after `delay` seconds. */
function rise(t: number, delay: number, motion: boolean) {
  if (!motion) return { a: 1, dy: 0, s: 1 };
  const p = outQuart(clamp01((t - delay * 1000) / 700));
  return { a: p, dy: 18 * (1 - p), s: 1 };
}

/** A big word popping in with a little overshoot. */
function pop(t: number, motion: boolean, delay = 0.15) {
  if (!motion) return { a: 1, dy: 0, s: 1 };
  const p = clamp01((t - delay * 1000) / 800);
  return p < 0.6
    ? { a: p / 0.6, dy: 0, s: 0.6 + 0.46 * outCubic(p / 0.6) }
    : { a: 1, dy: 0, s: 1.06 - 0.06 * ((p - 0.6) / 0.4) };
}

function countUp(value: number, t: number, delayMs: number, ms: number, motion: boolean) {
  if (!motion) return value;
  return Math.round(value * outCubic(clamp01((t - delayMs) / ms)));
}

// ── Text ────────────────────────────────────────────────────────────────

type Style = {
  size: number;
  weight: 600 | 700 | 800;
  display?: boolean;
  lh?: number;
  color?: string;
  tracking?: number;
  upper?: boolean;
};
type Block = {
  lines: string[];
  style: Style;
  font: string;
  height: number;
  gap: number;
  anim: Anim;
};
type Anim = { a: number; dy: number; s: number };

const wrapCache = new Map<string, string[]>();
function lines(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  width: number,
  balance = false,
  clamp = 99,
) {
  const key = `${font}|${width}|${balance}|${clamp}|${text}`;
  const hit = wrapCache.get(key);
  if (hit) return hit;
  let out = wrap(ctx, text, font, width);
  if (balance && out.length > 1) {
    // Like CSS text-wrap: balance — the narrowest width that keeps the same number of lines.
    let lo = width / 2;
    let hi = width;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      if (wrap(ctx, text, font, mid).length <= out.length) hi = mid;
      else lo = mid;
    }
    out = wrap(ctx, text, font, hi);
  }
  if (out.length > clamp) {
    out = out.slice(0, clamp);
    let last = out[clamp - 1]!;
    while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    out[clamp - 1] = `${last.trimEnd()}…`;
  }
  if (wrapCache.size > 500) wrapCache.clear();
  wrapCache.set(key, out);
  return out;
}

function block(
  ctx: CanvasRenderingContext2D,
  look: Look,
  text: string,
  style: Style,
  width: number,
  anim: Anim,
  opts: { gap?: number; balance?: boolean; clamp?: number } = {},
): Block {
  const font = `${style.weight} ${style.size}px ${style.display ? look.display : look.body}`;
  const t = style.upper ? text.toUpperCase() : text;
  ctx.letterSpacing = `${style.tracking ?? 0}px`;
  const ls = lines(ctx, t, font, width, opts.balance, opts.clamp);
  ctx.letterSpacing = "0px";
  const height = ls.length * style.size * (style.lh ?? 1.3);
  return { lines: ls, style, font, height, gap: opts.gap ?? 0, anim };
}

/** Top of a vertically centred stack; slides with a critter keep the text above it. */
const centred = (h: number, critter = true) =>
  critter ? Math.max(56, 56 + (H - 196 - h) / 2) : (H - h) / 2;

const stackHeight = (blocks: Block[]) =>
  blocks.reduce((h, b, i) => h + b.height + (i ? b.gap : 0), 0);

/** Draws blocks top to bottom from `top`, each with its own entrance. */
function drawStack(
  ctx: CanvasRenderingContext2D,
  blocks: Block[],
  x: number,
  top: number,
  align: CanvasTextAlign,
) {
  let y = top;
  blocks.forEach((b, i) => {
    if (i) y += b.gap;
    const lh = b.style.size * (b.style.lh ?? 1.3);
    if (b.anim.a > 0) {
      ctx.save();
      ctx.globalAlpha *= b.anim.a;
      ctx.translate(x, y + b.anim.dy + b.height / 2);
      ctx.scale(b.anim.s, b.anim.s);
      ctx.font = b.font;
      ctx.letterSpacing = `${b.style.tracking ?? 0}px`;
      ctx.fillStyle = b.style.color ?? "#fff";
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      b.lines.forEach((line, j) => ctx.fillText(line, 0, -b.height / 2 + j * lh + lh / 2));
      ctx.restore();
    }
    y += b.height;
  });
  return y;
}

const white = (a: number) => `rgba(255, 255, 255, ${a})`;

// ── Pictures & decorations ──────────────────────────────────────────────

function drawCover(
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

function roundRect(
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

function gradient(ctx: CanvasRenderingContext2D, look: Look, soft = false) {
  const [from, to] = soft ? look.soft : [look.primary, look.deep];
  // linear-gradient(160deg, …) like the app's CSS.
  const a = (160 * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(W * dx) + Math.abs(H * dy);
  const g = ctx.createLinearGradient(
    W / 2 - (dx * len) / 2,
    H / 2 - (dy * len) / 2,
    W / 2 + (dx * len) / 2,
    H / 2 + (dy * len) / 2,
  );
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** A photo filling the slide: zooming slowly behind text ("dim"), or blurred as a soft background. */
function backdrop(
  ctx: CanvasRenderingContext2D,
  look: Look,
  pic: Picture | undefined,
  mode: "dim" | "blur",
  t: number,
  motion: boolean,
) {
  if (!pic) return gradient(ctx, look);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (mode === "blur") {
    ctx.globalAlpha = 0.6;
    drawCover(ctx, pic.blur, -18, -32, W + 36, H + 64);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const p = motion ? outCubic(clamp01(t / 5000)) : 0;
  ctx.save();
  ctx.translate(W / 2 + 0.02 * W * p, H / 2 - 0.015 * H * p);
  ctx.scale(1.02 + 0.1 * p, 1.02 + 0.1 * p);
  drawCover(ctx, pic.img, -W / 2, -H / 2, W, H);
  ctx.restore();
  const g = ctx.createLinearGradient(0, H, 0, 0);
  g.addColorStop(0, "rgba(0, 0, 0, 0.8)");
  g.addColorStop(0.5, "rgba(0, 0, 0, 0.25)");
  g.addColorStop(1, "rgba(0, 0, 0, 0.3)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawPixels(
  ctx: CanvasRenderingContext2D,
  runs: { x: number; y: number; w: number; fill: string }[],
  grid: number,
  size: number,
) {
  const px = size / grid;
  for (const r of runs) {
    ctx.fillStyle = r.fill;
    // A hair of overlap so neighbouring runs never show seams when scaled.
    ctx.fillRect(r.x * px, r.y * px, r.w * px + 0.3, px + 0.3);
  }
}

/** One of your critters, swaying gently from its feet. */
function critter(
  ctx: CanvasRenderingContext2D,
  look: Look,
  c: Critter,
  p: Pose,
  cx: number,
  bottom: number,
  size: number,
  t: number,
  motion: boolean,
  phase = 0,
) {
  const angle = motion
    ? ((2.5 * Math.PI) / 180) * -Math.cos((2 * Math.PI * (t / 1000 + phase)) / 3.4)
    : 0;
  ctx.save();
  ctx.translate(cx, bottom - size * 0.1);
  ctx.rotate(angle);
  ctx.translate(-size / 2, -size * 0.9);
  if (look.pixel) drawPixels(ctx, pixelRuns(c, p), 24, size);
  else {
    const img = look.critters.get(`${c}-${p}`);
    if (img) ctx.drawImage(img, 0, 0, size, size);
  }
  ctx.restore();
}

function heart(ctx: CanvasRenderingContext2D, look: Look, x: number, y: number) {
  if (look.pixel) {
    ctx.save();
    ctx.translate(x - 11, y - 11);
    drawPixels(ctx, emojiRuns("heart"), 16, 22);
    ctx.restore();
  } else {
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💗", x, y);
  }
}

/** A dozen hearts drifting up the slide. */
function hearts(ctx: CanvasRenderingContext2D, look: Look, t: number, motion: boolean) {
  if (!motion) return;
  for (let i = 0; i < 12; i++) {
    const delay = (i * 0.41) % 3;
    const dur = 3.2 + (i % 4) * 0.5;
    const s = t / 1000 - delay;
    if (s < 0) continue;
    const p = (s % dur) / dur;
    const sway = i % 2 ? 18 : -18;
    const inP = (q: number) => q * q;
    const half = p < 0.5;
    const q = inP(half ? p / 0.5 : (p - 0.5) / 0.5);
    const dy = half ? -0.45 * H * q : -0.45 * H - 0.5 * H * q;
    const dx = half ? sway * q : sway * (1 - q);
    const scale = half ? 0.6 + 0.5 * q : 1.1 - 0.2 * q;
    ctx.save();
    ctx.globalAlpha *= p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    ctx.translate((((i * 37) % 100) / 100) * W + 11 + dx, H + 40 - 11 + dy);
    ctx.scale(scale, scale);
    heart(ctx, look, 0, 0);
    ctx.restore();
  }
}

// ── Slides ──────────────────────────────────────────────────────────────

function drawSlide(
  ctx: CanvasRenderingContext2D,
  look: Look,
  pics: Pictures,
  slide: Slide,
  t: number,
  motion: boolean,
) {
  const cw = W - PAD * 2;
  const pic = (url: string | null) => (url ? pics.get(url) : undefined);
  const r = look.pixel ? 0 : 1; // Pixel style: square corners everywhere

  switch (slide.kind) {
    case "intro": {
      backdrop(ctx, look, pic(slide.cover), "dim", t, motion);
      const blocks = [
        block(
          ctx,
          look,
          "Your story",
          { size: 14, weight: 700, color: white(0.75), tracking: 2.8, upper: true },
          cw,
          rise(t, 0.2, motion),
        ),
        block(
          ctx,
          look,
          slide.names.join(" & "),
          { size: 48, weight: 800, display: true, lh: 1.05 },
          cw,
          rise(t, 0.45, motion),
          { gap: 8, balance: true },
        ),
        block(
          ctx,
          look,
          slide.range,
          { size: 16, weight: 600, color: white(0.85) },
          cw,
          rise(t, 0.8, motion),
          { gap: 12 },
        ),
      ];
      drawStack(ctx, blocks, PAD, H * 0.82 - stackHeight(blocks), "left");
      return;
    }
    case "days": {
      gradient(ctx, look);
      const blocks = [
        block(
          ctx,
          look,
          "Today is day",
          { size: 18, weight: 700, color: white(0.85) },
          cw,
          rise(t, 0.1, motion),
        ),
        block(
          ctx,
          look,
          countUp(slide.days, t, 0, 1800, motion).toLocaleString(),
          { size: 88, weight: 800, display: true, lh: 1 },
          cw,
          pop(t, motion),
          { gap: 4 },
        ),
        block(ctx, look, "of us 💗", { size: 18, weight: 700 }, cw, rise(t, 0.4, motion), {
          gap: 4,
        }),
        block(
          ctx,
          look,
          `Together since ${slide.since}`,
          { size: 14, weight: 600, color: white(0.75) },
          cw,
          rise(t, 1.6, motion),
          { gap: 24 },
        ),
      ];
      drawStack(ctx, blocks, W / 2, centred(stackHeight(blocks)), "center");
      bottomCritter(ctx, look, "cat", "cheer", t, motion);
      return;
    }
    case "chapter": {
      backdrop(ctx, look, pic(slide.cover), "blur", t, motion);
      const blocks = [
        block(
          ctx,
          look,
          slide.year,
          { size: 16, weight: 700, color: white(0.8) },
          cw,
          rise(t, 0.1, motion),
        ),
        block(
          ctx,
          look,
          slide.month,
          { size: 60, weight: 800, display: true, lh: 1.1 },
          cw,
          pop(t, motion),
          { gap: 4 },
        ),
        block(
          ctx,
          look,
          slide.memories === 1 ? "1 memory" : `${slide.memories} memories`,
          { size: 14, weight: 600, color: white(0.85) },
          cw,
          rise(t, 0.6, motion),
          { gap: 12 },
        ),
      ];
      drawStack(ctx, blocks, W / 2, centred(stackHeight(blocks), false), "center");
      return;
    }
    case "photo":
    case "top": {
      const p = slide.photo;
      const top = slide.kind === "top";
      const picture = pic(p.url);
      backdrop(ctx, look, picture, "blur", t, motion);
      if (picture) {
        // The whole photo, fitted between the top bar and the caption, slowly zooming.
        const boxW = W - 32;
        const boxH = H * 0.62;
        const fit = Math.min(boxW / picture.img.width, boxH / picture.img.height);
        const dw = picture.img.width * fit;
        const dh = picture.img.height * fit;
        const k = motion ? outCubic(clamp01(t / SLIDE_MS[slide.kind])) : 0;
        const kx = slide.kind === "photo" && slide.index % 2 ? -0.02 : 0.02;
        const radius = 16 * r;
        ctx.save();
        ctx.translate(W / 2 + kx * dw * k, H * 0.14 + boxH / 2 - 0.015 * dh * k);
        ctx.scale(1.02 + 0.1 * k, 1.02 + 0.1 * k);
        ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
        ctx.shadowBlur = 50;
        ctx.shadowOffsetY = 25;
        roundRect(ctx, -dw / 2, -dh / 2, dw, dh, radius);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.save();
        ctx.clip();
        ctx.drawImage(picture.img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
        if (top) {
          roundRect(ctx, -dw / 2 - 2, -dh / 2 - 2, dw + 4, dh + 4, radius + 2 * r);
          ctx.strokeStyle = white(0.8);
          ctx.lineWidth = 4;
          ctx.stroke();
        }
        ctx.restore();
      }
      if (top) hearts(ctx, look, t, motion);
      const extra =
        top && p.reactions + p.comments > 0
          ? ` · ${p.reactions} ${p.reactions === 1 ? "heart" : "hearts"} · ${p.comments} ${p.comments === 1 ? "comment" : "comments"}`
          : "";
      const blocks = [
        ...(top
          ? [
              block(
                ctx,
                look,
                "Your most-loved memory",
                { size: 14, weight: 700, color: white(0.8), tracking: 2.1, upper: true },
                cw,
                rise(t, 0.2, motion),
              ),
            ]
          : []),
        ...(p.caption
          ? [
              block(
                ctx,
                look,
                p.caption,
                { size: 24, weight: 700, display: true, lh: 1.25 },
                cw,
                rise(t, 0.35, motion),
                { gap: 4, balance: true, clamp: 3 },
              ),
            ]
          : []),
        block(
          ctx,
          look,
          `${niceDate(p.date)}${extra}`,
          { size: 14, weight: 600, color: white(0.75) },
          cw,
          rise(t, 0.5, motion),
          { gap: 6 },
        ),
      ];
      const h = stackHeight(blocks);
      const shade = ctx.createLinearGradient(0, H - h - 96, 0, H);
      shade.addColorStop(0, "rgba(0, 0, 0, 0)");
      shade.addColorStop(1, "rgba(0, 0, 0, 0.7)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, H - h - 96, W, h + 96);
      drawStack(ctx, blocks, PAD, H - 32 - h, "left");
      return;
    }
    case "diary": {
      const e = slide.entry;
      gradient(ctx, look, true);
      const body = rise(t, 0.4, motion);
      const blocks = [
        block(
          ctx,
          look,
          "From the diary",
          { size: 14, weight: 700, color: white(0.75), tracking: 2.1, upper: true },
          cw,
          rise(t, 0.1, motion),
        ),
        ...(e.mood
          ? [
              block(ctx, look, e.mood, { size: 60, weight: 700, lh: 1.1 }, cw, pop(t, motion), {
                gap: 16,
              }),
            ]
          : []),
        ...(e.title
          ? [
              block(
                ctx,
                look,
                e.title,
                { size: 30, weight: 800, display: true, lh: 1.25 },
                cw,
                body,
                { gap: 16, clamp: 2 },
              ),
            ]
          : []),
        block(
          ctx,
          look,
          `“${e.body.trim()}”`,
          { size: 20, weight: 600, lh: 1.375, color: white(0.95) },
          cw,
          body,
          { gap: 12, clamp: 8 },
        ),
        block(
          ctx,
          look,
          `— ${e.who}, ${niceDate(e.date)}`,
          { size: 14, weight: 700, color: white(0.75) },
          cw,
          rise(t, 0.9, motion),
          { gap: 20 },
        ),
      ];
      drawStack(ctx, blocks, PAD, centred(stackHeight(blocks)), "left");
      bottomCritter(ctx, look, "seal", "love", t, motion);
      return;
    }
    case "question": {
      const q = slide.question;
      gradient(ctx, look);
      const w = W - 48;
      const head = rise(t, 0.1, motion);
      const blocks = [
        block(
          ctx,
          look,
          "You both answered",
          { size: 14, weight: 700, color: white(0.75), tracking: 2.1, upper: true },
          w,
          head,
        ),
        block(ctx, look, q.prompt, { size: 30, weight: 800, display: true, lh: 1.25 }, w, head, {
          gap: 8,
          balance: true,
          clamp: 4,
        }),
      ];
      // Answer bubbles: white, one from each side, tails towards their side.
      const maxW = w * 0.85;
      const bubbles = q.answers.map((a, i) => {
        const name = block(
          ctx,
          look,
          a.who,
          { size: 12, weight: 700, color: look.deep },
          maxW - 40,
          NO_ANIM,
        );
        const text = block(
          ctx,
          look,
          a.body,
          { size: 16, weight: 600, color: INK },
          maxW - 40,
          NO_ANIM,
          { gap: 2, clamp: 4 },
        );
        ctx.font = text.font;
        const textW = Math.max(0, ...text.lines.map((l) => ctx.measureText(l).width));
        ctx.font = name.font;
        const nameW = ctx.measureText(a.who).width;
        return {
          i,
          name,
          text,
          w: Math.min(maxW, Math.max(textW, nameW) + 40),
          h: name.height + text.height + 2 + 28,
        };
      });
      const total = stackHeight(blocks) + bubbles.reduce((n, b) => n + 16 + b.h, 0);
      let y = drawStack(ctx, blocks, 24, centred(total), "left");
      for (const b of bubbles) {
        y += 16;
        const d = 900 + b.i * 1100;
        const p = motion ? clamp01((t - d) / 600) : 1;
        if (p > 0) {
          const x = b.i ? W - 24 - b.w : 24;
          const e2 = outBack(p);
          ctx.save();
          ctx.globalAlpha *= clamp01(p * 1.5);
          ctx.translate(x + b.w / 2 + (b.i ? 40 : -40) * (1 - e2), y + b.h / 2);
          ctx.scale(0.9 + 0.1 * e2, 0.9 + 0.1 * e2);
          ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
          ctx.shadowBlur = 25;
          ctx.shadowOffsetY = 12;
          roundRect(
            ctx,
            -b.w / 2,
            -b.h / 2,
            b.w,
            b.h,
            b.i ? [24 * r, 24 * r, 6 * r, 24 * r] : [24 * r, 24 * r, 24 * r, 6 * r],
          );
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.shadowColor = "transparent";
          drawStack(ctx, [b.name, b.text], -b.w / 2 + 20, -b.h / 2 + 14, "left");
          ctx.restore();
        }
        y += b.h;
      }
      bottomCritter(ctx, look, "penguin", "curious", t, motion);
      return;
    }
    case "numbers": {
      gradient(ctx, look);
      const w = W - 64;
      const blocks = [
        block(
          ctx,
          look,
          "Your time together, in numbers",
          { size: 30, weight: 800, display: true, lh: 1.25 },
          w,
          rise(t, 0.1, motion),
        ),
      ];
      slide.items.forEach((it, i) => {
        const a = rise(t, 0.6 + i * 0.7, motion);
        blocks.push(
          block(
            ctx,
            look,
            countUp(it.value, t, 600 + i * 700, 1200, motion).toLocaleString(),
            { size: 60, weight: 800, display: true, lh: 1 },
            w,
            a,
            { gap: 24 },
          ),
          block(ctx, look, it.label, { size: 16, weight: 700, color: white(0.85) }, w, a, {
            gap: 4,
          }),
        );
      });
      drawStack(ctx, blocks, 32, centred(stackHeight(blocks)), "left");
      bottomCritter(ctx, look, "cat", "wave", t, motion);
      return;
    }
    case "outro": {
      gradient(ctx, look);
      hearts(ctx, look, t, motion);
      const blocks = [
        block(
          ctx,
          look,
          "Here's to more of us",
          { size: 48, weight: 800, display: true, lh: 1.25 },
          cw,
          rise(t, 0.2, motion),
          { balance: true },
        ),
        block(
          ctx,
          look,
          `${slide.names.join(" & ")} 💗`,
          { size: 18, weight: 700, color: white(0.85) },
          cw,
          rise(t, 0.7, motion),
          { gap: 16 },
        ),
      ];
      const y = drawStack(ctx, blocks, W / 2, H * 0.26, "center");
      const a = rise(t, 1.1, motion);
      ctx.save();
      ctx.globalAlpha *= a.a;
      ctx.translate(0, a.dy);
      critter(ctx, look, "seal", "love", W / 2 - 48, y + 32 + 88, 88, t, motion);
      critter(ctx, look, "penguin", "love", W / 2 + 48, y + 32 + 88, 88, t, motion, 1.7);
      ctx.restore();
      return;
    }
  }
}

const NO_ANIM: Anim = { a: 1, dy: 0, s: 1 };

function bottomCritter(
  ctx: CanvasRenderingContext2D,
  look: Look,
  c: Critter,
  p: Pose,
  t: number,
  motion: boolean,
) {
  const a = rise(t, 0.9, motion);
  ctx.save();
  ctx.globalAlpha *= a.a;
  ctx.translate(0, a.dy);
  critter(ctx, look, c, p, W / 2, H * 0.94, 84, t, motion);
  ctx.restore();
}

let layer: HTMLCanvasElement | null = null;

function paint(
  ctx: CanvasRenderingContext2D,
  look: Look,
  pics: Pictures,
  slide: Slide,
  t: number,
  motion: boolean,
) {
  const scale = ctx.canvas.width / W;
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  drawSlide(ctx, look, pics, slide, t, motion);
  ctx.restore();
}

/** Draws the story `t` ms into slide `index`, cross-fading from the slide before. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  look: Look,
  pics: Pictures,
  slides: Slide[],
  index: number,
  t: number,
  motion = true,
) {
  const slide = slides[index]!;
  const prev = slides[index - 1];
  if (!motion || !prev || t >= FADE_MS) return paint(ctx, look, pics, slide, t, motion);
  paint(ctx, look, pics, prev, SLIDE_MS[prev.kind] + t, motion);
  const { width, height } = ctx.canvas;
  if (!layer || layer.width !== width || layer.height !== height) layer = canvasOf(width, height);
  paint(layer.getContext("2d")!, look, pics, slide, t, motion);
  ctx.save();
  ctx.globalAlpha = t / FADE_MS;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}
