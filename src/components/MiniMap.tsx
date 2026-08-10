import { useEffect, useRef, useState } from "react";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  mine?: boolean;
};

const TILE = 256;

function project(lat: number, lng: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const clamped = Math.max(-85, Math.min(85, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Tiny OpenStreetMap raster viewer. No API key and no map SDK — we place
 * plain tile <img>s around a computed centre and absolutely position pins.
 */
export function MiniMap({
  points,
  zoom = 13,
  height = 280,
}: {
  points: MapPoint[];
  zoom?: number;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 360);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-3xl bg-muted text-sm text-muted-foreground"
        style={{ height }}
      >
        No locations to show yet.
      </div>
    );
  }

  const centerLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const centerLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const center = project(centerLat, centerLng, zoom);

  const left = center.x - width / 2;
  const top = center.y - height / 2;
  const tiles: { x: number; y: number }[] = [];
  const maxTile = 2 ** zoom;
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
      if (ty < 0 || ty >= maxTile) continue;
      tiles.push({ x: ((tx % maxTile) + maxTile) % maxTile, y: ty });
      tiles[tiles.length - 1]!.x = tx; // keep raw x for positioning below
    }
  }

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-3xl border border-border bg-muted shadow-soft"
      style={{ height }}
    >
      {tiles.map((t) => {
        const wrapped = ((t.x % maxTile) + maxTile) % maxTile;
        return (
          <img
            key={`${t.x}-${t.y}`}
            src={`https://tile.openstreetmap.org/${zoom}/${wrapped}/${t.y}.png`}
            alt=""
            aria-hidden
            loading="lazy"
            width={TILE}
            height={TILE}
            className="absolute select-none"
            style={{ left: t.x * TILE - left, top: t.y * TILE - top }}
          />
        );
      })}

      {points.map((p) => {
        const pt = project(p.lat, p.lng, zoom);
        return (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: pt.x - left, top: pt.y - top }}
          >
            <div
              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold shadow-soft ${
                p.mine ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
              }`}
            >
              {p.label}
            </div>
            <div
              className={`mx-auto size-3 -translate-y-1 rotate-45 rounded-[2px] ${
                p.mine ? "bg-primary" : "bg-card"
              }`}
            />
          </div>
        );
      })}

      <span className="absolute bottom-1 right-2 rounded bg-card/80 px-1 text-[9px] text-muted-foreground">
        © OpenStreetMap
      </span>
    </div>
  );
}
