import { memo } from "react";
import type { SpriteDef } from "@/arcade/engine/types";

/** One <rect> per horizontal run of same-coloured pixels. */
function runs(def: SpriteDef) {
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  def.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      let w = 1;
      while (row[x + w] === ch) w += 1;
      const fill = def.palette[ch];
      if (fill) rects.push({ x, y, w, fill });
      x += w;
    }
  });
  return rects;
}

function Frame({ def, size, className }: { def: SpriteDef; size: number; className?: string }) {
  const h = def.rows.length;
  const w = def.rows.reduce((m, r) => Math.max(m, r.length), 0);
  const side = Math.max(w, h);
  return (
    <svg
      // Square viewBox with the art centred and sitting on the bottom edge.
      viewBox={`${-(side - w) / 2} ${-(side - h)} ${side} ${side}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ gridArea: "1 / 1" }}
    >
      {runs(def).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

/**
 * A game sprite as crisp SVG, for menus and cards. Give two frames and it flips between
 * them like a tiny animation (it rests on the first frame when "reduce motion" is on).
 */
export const PixelSprite = memo(function PixelSprite({
  frames,
  size = 48,
  className,
}: {
  frames: readonly SpriteDef[];
  size?: number;
  className?: string;
}) {
  const [a, b] = frames;
  if (!a) return null;
  return (
    <span
      className={className}
      style={{ display: "inline-grid", width: size, height: size, flexShrink: 0 }}
    >
      <Frame def={a} size={size} {...(b ? { className: "px-f0" } : {})} />
      {b ? <Frame def={b} size={size} className="px-f1" /> : null}
    </span>
  );
});
