import { memo, type ComponentType } from "react";
import { cn } from "@/lib/utils";

/*
 * Pixel icons: path data copied from pixelarticons v2.4.2 (https://github.com/halfmage/pixelarticons).
 *
 * MIT License
 *
 * Copyright (c) 2019 Gerrit Halfmann
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const ICONS = {
  comment: "M4 2h16v2H4zm0 14h14v2H4zM2 4h2v12H2zm18 0h2v18h-2zm-2 14h2v2h-2z",
  send: "M4 19h4v2H2v-8h2v6Zm8 0H8v-2h4v2Zm4-2h-4v-2h4v2Zm4-2h-4v-2h4v2Zm-10-2H4v-2h6v2Zm12 0h-2v-2h2v2ZM8 5H4v6H2V3h6v2Zm12 6h-4V9h4v2Zm-4-2h-4V7h4v2Zm-4-2H8V5h4v2Z",
  bookmark:
    "M6 2h12v2H6zM4 4h2v18H4zm14 0h2v18h-2zm-2 16h2v2h-2zm-2-2h2v2h-2zm-8 2h2v2H6zm2-2h2v2H8zm2-2h4v2h-4z",
  pencil:
    "M4 16H6V18H8V20H10V22H2V14H4V16ZM12 20H10V18H12V20ZM14 18H12V16H14V18ZM10 16H8V14H10V16ZM16 16H14V14H16V16ZM6 14H4V12H6V14ZM12 14H10V12H12V14ZM18 14H16V12H18V14ZM8 12H6V10H8V12ZM14 12H12V10H14V12ZM20 12H18V10H20V12ZM10 10H8V8H10V10ZM18 10H16V8H18V10ZM22 10H20V8H22V10ZM12 8H10V6H12V8ZM16 8H14V6H16V8ZM20 8H18V6H20V8ZM14 6H12V4H14V6ZM18 6H16V4H18V6ZM16 4H14V2H16V4Z",
  trash: "M18 22H6V20H18V22ZM9 6H15V4H17V6H22V8H20V20H18V8H6V20H4V8H2V6H7V4H9V6ZM15 4H9V2H15V4Z",
  mapPin:
    "M7 2h10v2H7zM5 4h2v2H5zm14 0h-2v2h2zM7 17h2v2H7zm2 2h2v2H9zm6-2h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2h-2zm-6-7h2v3H5zm12 0h2v3h-2zM3 6h2v8H3zm18 0h-2v8h2zM10 6h4v2h-4zM8 8h2v4H8zm2 4h4v2h-4zm4-4h2v4h-2z",
  chevronLeft:
    "M8 13v-2h2v2H8Zm2-2V9h2v2h-2Zm0 4v-2h2v2h-2Zm2-6V7h2v2h-2Zm0 8v-2h2v2h-2Zm2-10V5h2v2h-2Zm0 12v-2h2v2h-2Z",
  chevronRight:
    "M16 13v-2h-2v2h2Zm-2-2V9h-2v2h2Zm0 4v-2h-2v2h2Zm-2-6V7h-2v2h2Zm0 8v-2h-2v2h2ZM10 7V5H8v2h2Zm0 12v-2H8v2h2Z",
  close:
    "M7 19H5V17H7V19ZM19 19H17V17H19V19ZM9 15V17H7V15H9ZM17 17H15V15H17V17ZM11 15H9V13H11V15ZM15 15H13V13H15V15ZM13 13H11V11H13V13ZM11 11H9V9H11V11ZM15 11H13V9H15V11ZM9 9H7V7H9V9ZM17 9H15V7H17V9ZM7 7H5V5H7V7ZM19 7H17V5H19V7Z",
  imagePlus:
    "M4 2h10v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 6h2v10h-2zm-6 0h2v2h-2zm-2 2h2v2h-2zm4 0h2v2h-2zm-6 2h2v2h-2zm8 0h2v2h-2zM8 16h2v2H8zm-2 2h2v2H6zM8 6h2v2H8zM6 8h2v2H6zm2 2h2v2H8zm2-2h2v2h-2zm8-6h2v6h-2z M16 4h6v2h-6z",
  sort: "M16 4h2v16h-2zm-2 10h2v4h-2zm-2 0h2v2h-2zm6 0h2v4h-2zm2 0h2v2h-2zM6 20h2V4H6zM4 10h2V6H4zm-2 0h2V8H2zm6 0h2V6H8zm2 0h2V8h-2z",
  album:
    "M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zm-4 0h2v8h-2zm-4 0h2v8h-2z M14 3h2v7h-2z",
  images:
    "M7 2h14v2H7zm0 14h14v2H7zm-4 4h14v2H3zM5 4h2v12H5zM1 8h2v12H1zm20-4h2v12h-2zm-4 6h2v2h-2zm2 2h2v2h-2zm-4 0h2v2h-2zm-2 2h2v2h-2zm-2-8h2v2h-2zM9 8h2v2H9zm2 2h2v2h-2zm2-2h2v2h-2zM3 6h2v2H3zm14 12h2v2h-2z",
  calendar:
    "M5 4h14v2H5zm0 16h14v2H5zM3 10h2v10H3zm0-4h2v2H3zm16 0h2v2h-2zm0 4h2v10h-2zM3 8h18v2H3zm12-6h2v2h-2zM7 2h2v2H7z",
  plus: "M13 11h7v2h-7v7h-2v-7H4v-2h7V4h2v7Z",
} as const;

export type PixelIconName = keyof typeof ICONS;

/** A 24×24 pixel-grid icon in the current text colour. */
export function PixelIcon({ name, className }: { name: PixelIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={cn("size-5 shrink-0", className)}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

// Reaction emoji, drawn as 16×16 pixel art (one character per pixel, "." = empty).
const EMOJI = {
  heart: {
    palette: { o: "#5A1E34", r: "#FF5C8A", d: "#E0406F", w: "#FFD3E1" },
    rows: [
      "................",
      "...ooo....ooo...",
      "..orrro..orrro..",
      ".orrrrroorrrrro.",
      ".orwwrrrrrrrrro.",
      ".orwrrrrrrrrrro.",
      "orrrrrrrrrrrrrro",
      ".orrrrrrrrrrrro.",
      "..orrrrrrrrrro..",
      "...orrrrrrrro...",
      "...orrrrrrrdo...",
      "....orrrrrdo....",
      ".....orrrdo.....",
      "......ordo......",
      ".......oo.......",
      "................",
    ],
  },
  laugh: {
    palette: {
      o: "#5A3A1A",
      y: "#FFD45C",
      s: "#F2B33D",
      e: "#5A3A1A",
      m: "#7A2E3A",
      t: "#FFFFFF",
      p: "#FF7A9C",
      b: "#FF9DB5",
    },
    rows: [
      "......oooo......",
      "....ooyyyyoo....",
      "...oyyyyyyyyo...",
      "..oyyyyyyyyyyo..",
      ".oyyyyyyyyyyyyo.",
      ".oyyeyyyyyyeyyo.",
      "oyyyyeyyyyeyyyyo",
      "oyyyeyyyyyyeyyyo",
      "oyyyyyymmyyyyyyo",
      "oyybyttttttybyso",
      ".oyymmmmmmmmyso.",
      ".oyyymmppmmysso.",
      "..oyyymppmysso..",
      "...oyyyyyysso...",
      "....ooyyysoo....",
      "......oooo......",
    ],
  },
  hug: {
    palette: { o: "#5A3A1A", y: "#FFD45C", s: "#F2B33D", e: "#5A3A1A", b: "#FF9DB5", h: "#FFC24A" },
    rows: [
      "......oooo......",
      "....ooyyyyoo....",
      "...oyyyyyyyyo...",
      "..oyyyyyyyyyyo..",
      ".oyyyeyyyyeyyyo.",
      ".oyyeyeyyeyeyyo.",
      "oyyyyyyyyyyyyyyo",
      "oyybbyyyyyybbyyo",
      "oyyyyeyyyyeyyyyo",
      "oyyyyyeyyeyyyyso",
      ".oyyyyyeeyyyyso.",
      ".ooooyyyyyyoooo.",
      ".ohhhoyyyyohhho.",
      "ohhhhhoyyohhhhho",
      ".ohhhoyyysohhho.",
      "..ooo.oooo.ooo..",
    ],
  },
} as const;

export type PixelEmojiName = keyof typeof EMOJI;

/** One rect per horizontal run of same-coloured pixels (16x16). */
export function emojiRuns(name: PixelEmojiName) {
  const { palette, rows } = EMOJI[name];
  const pal = palette as Record<string, string>;
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      let w = 1;
      while (row[x + w] === ch) w += 1;
      if (ch !== ".") rects.push({ x, y, w, fill: pal[ch] ?? "transparent" });
      x += w;
    }
  });
  return rects;
}

/** A colour pixel-art emoji. Decorative: label the button that holds it. */
export const PixelEmoji = memo(function PixelEmoji({
  name,
  size = 24,
  className,
}: {
  name: PixelEmojiName;
  size?: number;
  className?: string;
}) {
  const rects = emojiRuns(name);
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      {rects.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
});

/** A pixel icon in the Pixel style, the normal line icon in every other style. */
export function StyleIcon({
  pixel,
  icon: Icon,
  className,
}: {
  pixel: PixelIconName;
  icon: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <>
      <PixelIcon name={pixel} className={cn("only-pixel", className)} />
      <Icon className={cn("not-pixel size-5 shrink-0", className)} />
    </>
  );
}

const EMOJI_CHAR: Record<PixelEmojiName, string> = { heart: "💗", laugh: "😆", hug: "🤗" };

/** Reaction emoji: pixel art in the Pixel style, the normal emoji in every other style. */
export function ReactionGlyph({ kind, popped }: { kind: PixelEmojiName; popped?: boolean }) {
  const pop = popped ? "react-pop" : "";
  return (
    <>
      <PixelEmoji name={kind} size={22} className={cn("only-pixel", pop)} />
      <span className={cn("not-pixel text-base leading-none", pop)} aria-hidden="true">
        {EMOJI_CHAR[kind]}
      </span>
    </>
  );
}
