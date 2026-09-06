import { useEffect, useRef } from "react";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  mine?: boolean;
};

type LeafletNS = typeof import("leaflet");

let leafletPromise: Promise<LeafletNS> | null = null;

/** Load Leaflet JS + CSS from CDN — no npm install needed. */
function loadLeaflet(): Promise<LeafletNS> {
  if (typeof window !== "undefined" && (window as unknown as { L?: LeafletNS }).L) {
    return Promise.resolve((window as unknown as { L: LeafletNS }).L);
  }
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    // CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // JS
    const existing = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () =>
        resolve((window as unknown as { L: LeafletNS }).L),
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve((window as unknown as { L: LeafletNS }).L);
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.head.appendChild(script);
  });

  return leafletPromise;
}

/**
 * Interactive map — pan, zoom, pins.
 * Leaflet is loaded from CDN so you don't need npm install.
 */
export function MiniMap({
  points,
  height = 320,
  focusId,
}: {
  points: MapPoint[];
  height?: number;
  focusId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any>(null);

  // Create map once Leaflet is ready
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const el = containerRef.current;
      if (!el || mapRef.current) return;

      const L = await loadLeaflet();
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      requestAnimationFrame(() => map.invalidateSize());
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
      }
    };
  }, []);

  // Update markers when points change
  useEffect(() => {
    void (async () => {
      const L = await loadLeaflet();
      const map = mapRef.current;
      const group = markersRef.current;
      if (!map || !group) return;

      group.clearLayers();

      if (points.length === 0) {
        map.setView([20, 0], 2);
        return;
      }

      const bounds = L.latLngBounds([]);

      for (const p of points) {
        const color = p.mine ? "hsl(330 70% 55%)" : "hsl(250 40% 45%)";
        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              display:flex;flex-direction:column;align-items:center;
              transform:translate(-50%,-100%);
            ">
              <span style="
                background:${p.mine ? color : "#fff"};
                color:${p.mine ? "#fff" : "#222"};
                border:1px solid rgba(0,0,0,.08);
                border-radius:999px;
                padding:3px 8px;
                font:700 10px/1.2 system-ui,sans-serif;
                white-space:nowrap;
                box-shadow:0 2px 8px rgba(0,0,0,.12);
              ">${escapeHtml(p.label)}</span>
              <span style="
                width:12px;height:12px;margin-top:-2px;
                background:${color};
                border:2px solid #fff;
                border-radius:50%;
                box-shadow:0 1px 4px rgba(0,0,0,.25);
              "></span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        group.addLayer(L.marker([p.lat, p.lng], { icon }));
        bounds.extend([p.lat, p.lng]);
      }

      if (points.length === 1) {
        map.setView([points[0]!.lat, points[0]!.lng], 14);
      } else {
        map.fitBounds(bounds.pad(0.35));
      }

      requestAnimationFrame(() => map.invalidateSize());
    })();
  }, [points]);

  // Fly to a pin when focus changes
  useEffect(() => {
    if (!focusId || !mapRef.current) return;
    const baseId = focusId.split(":")[0] ?? focusId;
    const p = points.find((x) => x.id === baseId);
    if (!p) return;
    mapRef.current.flyTo([p.lat, p.lng], 15, { duration: 0.6 });
  }, [focusId, points]);

  if (points.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-3xl border border-border bg-muted text-sm text-muted-foreground"
        style={{ height }}
      >
        No locations to show yet.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="z-0 overflow-hidden rounded-3xl border border-border shadow-soft"
      style={{ height, width: "100%" }}
    />
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
