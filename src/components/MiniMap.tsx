import { useEffect, useRef } from "react";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  mine?: boolean;
};

// Minimal Leaflet surface we use (loaded from CDN)
type LeafletMap = {
  remove: () => void;
  invalidateSize: () => void;
  setView: (latlng: [number, number], zoom: number) => void;
  fitBounds: (b: unknown, opts?: { padding?: [number, number] }) => void;
  flyTo: (latlng: [number, number], zoom: number, opts?: { duration?: number }) => void;
  dragging: { enable: () => void; disable: () => void };
  touchZoom: { enable: () => void };
  scrollWheelZoom: { enable: () => void };
  doubleClickZoom: { enable: () => void };
  boxZoom: { enable: () => void };
  keyboard: { enable: () => void };
  eachLayer?: (fn: (layer: unknown) => void) => void;
};
type LeafletLayerGroup = {
  clearLayers: () => void;
  addLayer: (layer: unknown) => void;
  addTo: (map: LeafletMap) => LeafletLayerGroup;
};
type LeafletNS = {
  map: (
    el: HTMLElement,
    opts?: Record<string, unknown>,
  ) => LeafletMap;
  tileLayer: (url: string, opts?: Record<string, unknown>) => { addTo: (m: LeafletMap) => unknown };
  layerGroup: () => LeafletLayerGroup;
  latLngBounds: (latlngs?: [number, number][]) => {
    extend: (latlng: [number, number]) => void;
    isValid: () => boolean;
    pad: (n: number) => unknown;
  };
  divIcon: (opts: Record<string, unknown>) => unknown;
  marker: (latlng: [number, number], opts?: Record<string, unknown>) => unknown;
};

let leafletPromise: Promise<LeafletNS> | null = null;

function loadLeaflet(): Promise<LeafletNS> {
  if (typeof window !== "undefined" && (window as unknown as { L?: LeafletNS }).L) {
    return Promise.resolve((window as unknown as { L: LeafletNS }).L);
  }
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Extra CSS so touch dragging works inside our rounded card
    if (!document.getElementById("leaflet-touch-fix")) {
      const style = document.createElement("style");
      style.id = "leaflet-touch-fix";
      style.textContent = `
        .leaflet-container {
          width: 100%;
          height: 100%;
          z-index: 0;
          touch-action: none;
          -webkit-tap-highlight-color: transparent;
          font: inherit;
        }
        .leaflet-pane, .leaflet-control {
          z-index: auto;
        }
        .leaflet-top, .leaflet-bottom {
          z-index: 10;
        }
        .blublub-map-wrap {
          touch-action: none;
          overscroll-behavior: contain;
        }
      `;
      document.head.appendChild(style);
    }

    const existing = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (existing) {
      const done = () => resolve((window as unknown as { L: LeafletNS }).L);
      if ((window as unknown as { L?: LeafletNS }).L) done();
      else existing.addEventListener("load", done);
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
 * Interactive Leaflet map — pan, pinch-zoom, partner pins.
 * Leaflet loads from CDN (no npm install).
 */
export function MiniMap({
  points,
  height = 340,
  focusId,
}: {
  points: MapPoint[];
  height?: number;
  focusId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletLayerGroup | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  // Create map once
  useEffect(() => {
    let cancelled = false;
    let resizeObs: ResizeObserver | null = null;

    void (async () => {
      const el = containerRef.current;
      if (!el) return;

      const L = await loadLeaflet();
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        tap: true,
        // Prefer touch drag over browser scroll while finger is on the map
        bounceAtZoomLimits: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Force interaction on (some mobile browsers need this after mount)
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();

      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      const refresh = () => {
        map.invalidateSize();
        applyPoints(L, map, markersRef.current, pointsRef.current);
      };

      // Size can be 0 on first paint — refresh a few times
      requestAnimationFrame(refresh);
      setTimeout(refresh, 100);
      setTimeout(refresh, 400);

      resizeObs = new ResizeObserver(() => map.invalidateSize());
      resizeObs.observe(el);
    })();

    return () => {
      cancelled = true;
      resizeObs?.disconnect();
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
      if (!mapRef.current || !markersRef.current) return;
      applyPoints(L, mapRef.current, markersRef.current, points);
      mapRef.current.invalidateSize();
    })();
  }, [points]);

  // Fly to pin when focus changes
  useEffect(() => {
    if (!focusId || !mapRef.current) return;
    const baseId = focusId.split(":")[0] ?? focusId;
    const p = points.find((x) => x.id === baseId);
    if (!p) return;
    mapRef.current.flyTo([p.lat, p.lng], 15, { duration: 0.55 });
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
      className="blublub-map-wrap relative overflow-hidden rounded-3xl border border-border shadow-soft"
      style={{ height, width: "100%", touchAction: "none" }}
    >
      <div
        ref={containerRef}
        style={{ height: "100%", width: "100%", touchAction: "none" }}
      />
    </div>
  );
}

function applyPoints(
  L: LeafletNS,
  map: LeafletMap,
  group: LeafletLayerGroup | null,
  points: MapPoint[],
) {
  if (!group) return;
  group.clearLayers();

  if (points.length === 0) {
    map.setView([20, 0], 2);
    return;
  }

  const bounds = L.latLngBounds([]);

  for (const p of points) {
    const color = p.mine ? "hsl(330 70% 55%)" : "hsl(250 40% 45%)";
    const icon = L.divIcon({
      className: "blublub-pin",
      html: `
        <div style="
          display:flex;flex-direction:column;align-items:center;
          transform:translate(-50%,-100%);
          pointer-events:none;
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

    group.addLayer(L.marker([p.lat, p.lng], { icon, interactive: false }));
    bounds.extend([p.lat, p.lng]);
  }

  if (points.length === 1) {
    map.setView([points[0]!.lat, points[0]!.lng], 14);
  } else if (bounds.isValid()) {
    map.fitBounds(bounds.pad(0.35));
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
