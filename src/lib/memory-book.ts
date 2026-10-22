/**
 * Memory book, drawn as page pictures. The same pages feed the in-app preview and the PDF,
 * so what you see is exactly what you save — and emoji and the app's fonts work (the PDF's
 * built-in font can't draw emoji).
 *
 * Layout units are PDF points on an A4 page (595 × 842). A page is a list of draw steps;
 * `renderPage` paints them on a canvas at any scale, in the app style (style-paint.ts): its
 * paper, fonts, colours and photo frames.
 */
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { paintPhoto, paintStage, prepareLook, rgba, traits, type Look } from "@/lib/style-paint";

export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
const M = 48;
const CONTENT_W = PAGE_W - M * 2;
const FOOTER = 28;

type Step =
  | {
      t: "text";
      x: number;
      y: number;
      text: string;
      font: string;
      color: string;
      align?: CanvasTextAlign;
    }
  | { t: "rect"; x: number; y: number; w: number; h: number; color: string; r?: number }
  | { t: "photo"; x: number; y: number; w: number; h: number; photo: number; seed: number };
export type BookPage = Step[];

export type BookPhoto = { blob: Blob; w: number; h: number };
export type Book = { pages: BookPage[]; photos: BookPhoto[]; look: Look; title: string };

/** Canvas → JPEG Blob without canvas.toBlob: that callback is throttled to ~1s each while the
 *  app is in the background (seen: 180 photos went from 40s to 100s+). toDataURL isn't. */
export function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  const b64 = canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/jpeg" });
}

/** Fetches a photo and shrinks it (longest side 1280px, JPEG) so the book stays shareable.
 *  ponytail: screen/share quality; a print-quality book will need larger photos. */
async function shrinkPhoto(url: string): Promise<BookPhoto> {
  const bitmap = await createImageBitmap(await (await fetch(url)).blob());
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return { blob: canvasToJpeg(canvas, 0.8), w, h };
}

/** Runs `fn` over items, `limit` at a time, keeping order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

const niceDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Word-wraps text to a width with the real font (emoji included), keeping blank lines. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, font: string, width: number) {
  ctx.font = font;
  const lines: string[] = [];
  for (const para of text.replace(/\r/g, "").split("\n")) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const tryLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(tryLine).width <= width || !line) line = tryLine;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Lays pages out top to bottom, starting a new page when something doesn't fit. */
class Pager {
  pages: BookPage[] = [];
  y = M;
  constructor() {
    this.newPage();
  }
  get page() {
    return this.pages[this.pages.length - 1]!;
  }
  newPage() {
    this.pages.push([]);
    this.y = M;
  }
  need(h: number) {
    if (this.y + h > PAGE_H - M - FOOTER) this.newPage();
  }
}

export async function prepareBook(opts: {
  coupleId: string;
  from: string;
  to: string;
  names: string[];
  nameOf: (id: string) => string;
  onProgress: (done: number, total: number) => void;
}): Promise<Book> {
  const { coupleId, from, to } = opts;
  const [{ data: entries, error: dErr }, { data: photos, error: pErr }] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("*")
      .eq("couple_id", coupleId)
      .gte("entry_date", from)
      .lte("entry_date", to)
      .order("entry_date"),
    supabase
      .from("photos")
      .select("*")
      .eq("couple_id", coupleId)
      .gte("taken_on", from)
      .lte("taken_on", to)
      .order("taken_on"),
  ]);
  if (dErr) throw dErr;
  if (pErr) throw pErr;
  const posts = (photos ?? []).filter((p) => p.storage_path || p.body?.trim());
  if ((entries?.length ?? 0) === 0 && posts.length === 0)
    throw new Error("Nothing found in that date range");

  // One request for every photo link, then four downloads at a time.
  const paths = posts.map((p) => p.storage_path).filter((x): x is string => !!x);
  const { data: signed } = paths.length
    ? await supabase.storage.from("photos").createSignedUrls(paths, 600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((x) => [x.path, x.signedUrl] as const));
  let done = 0;
  opts.onProgress(0, paths.length);
  const shrunk = await mapLimit(posts, 4, async (p) => {
    const url = p.storage_path ? urlByPath.get(p.storage_path) : undefined;
    if (!url) return null;
    try {
      return await shrinkPhoto(url);
    } catch {
      return null; // skip a photo that can't be fetched rather than failing the book
    } finally {
      opts.onProgress(++done, paths.length);
    }
  });

  // The app style (and its fonts, ready before measuring text) decides how the book looks.
  const look = await prepareLook();
  const FONT_TITLE = look.display;
  const FONT_BODY = look.body;
  const INK = rgba(traits(look).page);
  const MUTED = rgba(traits(look).page, 0.65);
  const accent = look.primary;
  const bookPhotos: BookPhoto[] = [];
  const photoIndex = shrunk.map((s) => (s ? bookPhotos.push(s) - 1 : -1));
  const measure = document.createElement("canvas").getContext("2d")!;
  const pg = new Pager();

  // Cover: the newest photo in the range, the title, your names, the dates.
  // Plain-paper styles get a colour band behind the photo; the others have their own page.
  const coverIdx = [...photoIndex].reverse().find((i) => i >= 0);
  if (["classic", "pixel", "jelly", "glass"].includes(look.skin)) {
    pg.page.push({ t: "rect", x: 0, y: 0, w: PAGE_W, h: 300, color: accent });
  }
  if (coverIdx !== undefined) {
    const ph = bookPhotos[coverIdx]!;
    const box = 300;
    const s = Math.min(box / ph.w, box / ph.h);
    const w = ph.w * s;
    const h = ph.h * s;
    pg.page.push({ t: "photo", x: (PAGE_W - w) / 2, y: 150, w, h, photo: coverIdx, seed: 1 });
  }
  const titleY = coverIdx !== undefined ? 520 : 380;
  pg.page.push({
    t: "text",
    x: PAGE_W / 2,
    y: titleY,
    text: "Our memory book",
    font: `700 34px ${FONT_TITLE}`,
    color: INK,
    align: "center",
  });
  if (opts.names.length) {
    pg.page.push({
      t: "text",
      x: PAGE_W / 2,
      y: titleY + 34,
      text: opts.names.join(" & "),
      font: `700 16px ${FONT_BODY}`,
      color: INK,
      align: "center",
    });
  }
  pg.page.push({
    t: "text",
    x: PAGE_W / 2,
    y: titleY + 58,
    text: `${niceDate(from)} – ${niceDate(to)}`,
    font: `400 12px ${FONT_BODY}`,
    color: MUTED,
    align: "center",
  });

  const heading = (text: string) => {
    pg.newPage();
    pg.page.push({ t: "rect", x: M, y: pg.y, w: 36, h: 6, color: accent, r: 3 });
    pg.y += 34;
    pg.page.push({ t: "text", x: M, y: pg.y, text, font: `700 26px ${FONT_TITLE}`, color: INK });
    pg.y += 30;
  };

  const writeLines = (lines: string[], font: string, color: string, lh: number, x = M) => {
    for (const line of lines) {
      pg.need(lh);
      pg.page.push({ t: "text", x, y: pg.y, text: line, font, color });
      pg.y += lh;
    }
  };

  // Diary
  if (entries && entries.length > 0) {
    heading("Diary");
    const bodyFont = `400 12px ${FONT_BODY}`;
    for (const e of entries) {
      pg.need(70);
      const title = `${e.mood ? `${e.mood} ` : ""}${e.title || "Untitled"}`;
      pg.page.push({
        t: "text",
        x: M,
        y: pg.y,
        text: title,
        font: `700 16px ${FONT_TITLE}`,
        color: INK,
      });
      pg.y += 17;
      pg.page.push({
        t: "text",
        x: M,
        y: pg.y,
        text: `${niceDate(e.entry_date)} · ${opts.nameOf(e.created_by)}`,
        font: `400 10px ${FONT_BODY}`,
        color: MUTED,
      });
      pg.y += 20;
      writeLines(wrap(measure, e.body ?? "", bodyFont, CONTENT_W), bodyFont, INK, 17);
      pg.y += 18;
    }
  }

  // Photos and text posts, in date order
  if (posts.length > 0) {
    heading("Photos & notes");
    const maxH = PAGE_H - M * 2 - FOOTER - 40; // room for the caption
    posts.forEach((p, i) => {
      const idx = photoIndex[i]!;
      const caption = `${niceDate(p.taken_on)}${p.caption ? ` · ${p.caption}` : ""}`;
      if (idx >= 0) {
        const ph = bookPhotos[idx]!;
        const s = Math.min(CONTENT_W / ph.w, maxH / ph.h);
        const w = ph.w * s;
        const h = ph.h * s;
        pg.need(h + 34);
        pg.page.push({
          t: "photo",
          x: M + (CONTENT_W - w) / 2,
          y: pg.y,
          w,
          h,
          photo: idx,
          seed: i,
        });
        pg.y += h + 18;
        const capLines = wrap(measure, caption, `400 11px ${FONT_BODY}`, CONTENT_W);
        writeLines(capLines, `400 11px ${FONT_BODY}`, MUTED, 15);
        pg.y += 16;
      } else if (p.body?.trim()) {
        const lines = wrap(measure, p.body, `400 13px ${FONT_BODY}`, CONTENT_W);
        pg.need(Math.min(lines.length, 6) * 19 + 46);
        pg.page.push({
          t: "text",
          x: M,
          y: pg.y,
          text: caption,
          font: `400 10px ${FONT_BODY}`,
          color: MUTED,
        });
        pg.y += 20;
        writeLines(lines, `400 13px ${FONT_BODY}`, INK, 19);
        pg.y += 22;
      }
    });
  }

  // Page numbers (not on the cover)
  pg.pages.forEach((page, i) => {
    if (i > 0) {
      page.push({
        t: "text",
        x: PAGE_W / 2,
        y: PAGE_H - M / 2 - 4,
        text: String(i + 1),
        font: `400 10px ${FONT_BODY}`,
        color: MUTED,
        align: "center",
      });
    }
  });

  return {
    pages: pg.pages,
    photos: bookPhotos,
    look,
    title: `blublub-memory-book-${from}-to-${to}`,
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 0,
) {
  ctx.beginPath();
  if (r > 0 && "roundRect" in ctx) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** Paints one page on a new canvas. `scale` 1 = 1 pixel per PDF point. */
export async function renderPage(book: Book, index: number, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(PAGE_W * scale);
  canvas.height = Math.round(PAGE_H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  paintStage(ctx, book.look, PAGE_W, PAGE_H, 0, { page: true });
  ctx.textBaseline = "alphabetic";
  for (const step of book.pages[index] ?? []) {
    if (step.t === "rect") {
      ctx.fillStyle = step.color;
      roundRect(ctx, step.x, step.y, step.w, step.h, step.r);
      ctx.fill();
    } else if (step.t === "text") {
      ctx.font = step.font;
      ctx.fillStyle = step.color;
      ctx.textAlign = step.align ?? "left";
      ctx.fillText(step.text, step.x, step.y);
    } else {
      const ph = book.photos[step.photo];
      if (!ph) continue;
      const bmp = await createImageBitmap(ph.blob);
      paintPhoto(ctx, book.look, bmp, step.x, step.y, step.w, step.h, { seed: step.seed, u: 1.2 });
      bmp.close();
    }
  }
  return canvas;
}

export const nextTask = () =>
  new Promise<void>((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(0);
  });

/** The same pages, one picture per PDF page. */
export async function bookToPdf(book: Book, onProgress: (done: number, total: number) => void) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  for (let i = 0; i < book.pages.length; i++) {
    const canvas = await renderPage(book, i, 2);
    if (i > 0) doc.addPage();
    doc.addImage(
      canvas.toDataURL("image/jpeg", 0.82),
      "JPEG",
      0,
      0,
      PAGE_W,
      PAGE_H,
      undefined,
      "FAST",
    );
    canvas.width = canvas.height = 0; // free the pixels before the next page
    onProgress(i + 1, book.pages.length);
    await nextTask(); // let the progress bar update (setTimeout is slowed to 1s in the background)
  }
  return new File([doc.output("blob")], `${book.title}.pdf`, { type: "application/pdf" });
}
