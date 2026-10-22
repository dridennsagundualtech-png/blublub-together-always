import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  LngLatBounds,
  Map as MapLibre,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type MapMouseEvent,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Box, Camera, Layers, X } from "lucide-react";
import { MiniMap, type MapPoint } from "@/components/MiniMap";
import { loadMapSettings } from "@/lib/map-settings";

// MapLibre's helper worker, bundled by Vite (it can't find it on its own once bundled).
setWorkerUrl(workerUrl);

/** OpenFreeMap: free vector maps, no key. Liberty has the 3D buildings. */
const STYLE = (skin: string | undefined) =>
  `https://tiles.openfreemap.org/styles/${skin === "cyberpunk" ? "dark" : "liberty"}`;

// Satellite: Sentinel-2 cloudless 2016 (CC BY 4.0, free for any use, city-level detail), or the
// person's own ArcGIS key for street-level World Imagery (free tier: 2 million tiles a month).
const EOX = {
  tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg"],
  maxzoom: 14,
  attribution:
    '<a href="https://s2maps.eu" target="_blank">Sentinel-2 cloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)',
};
const ESRI = (key: string) => ({
  tiles: [
    `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${encodeURIComponent(key)}`,
  ],
  maxzoom: 19,
  attribution: "Powered by Esri · Esri, Vantor, Earthstar Geographics, and the GIS User Community",
});

const MAPILLARY_GREEN = "#05cb63";
type StreetPhoto = { id: string; url: string; date: string } | "none" | "loading";

/**
 * The 3D map: OpenFreeMap streets with tilting 3D buildings, a satellite view and Mapillary
 * street photos. Same pins as the classic map (MiniMap), which it falls back to without WebGL.
 */
export default function WorldMap({
  points,
  height = 340,
  focusId,
}: {
  points: MapPoint[];
  height?: number;
  focusId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const fittedRef = useRef(0); // how many pins the view was last fitted to
  const streetRef = useRef(false);
  const [settings] = useState(loadMapSettings);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [tilted, setTilted] = useState(false);
  const [street, setStreet] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const [photo, setPhoto] = useState<StreetPhoto | null>(null);

  // Create the map once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let map: MapLibre;
    try {
      map = new MapLibre({
        container: el,
        style: STYLE(document.documentElement.dataset["skin"]),
        center: [0, 20],
        zoom: 1.4,
        attributionControl: { compact: true },
        maxPitch: 70,
      });
    } catch {
      setFailed(true); // no WebGL: the classic map takes over
      return;
    }
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => {
      // The dark (Cyberpunk) map has no 3D buildings of its own: add Liberty's, in night colours.
      if (!map.getLayer("building-3d")) {
        map.addLayer(
          {
            id: "building-3d",
            type: "fill-extrusion",
            source: "openmaptiles",
            "source-layer": "building",
            minzoom: 14,
            paint: {
              "fill-extrusion-base": ["get", "render_min_height"],
              "fill-extrusion-height": ["get", "render_height"],
              "fill-extrusion-color": "#1d2a5c",
              "fill-extrusion-opacity": 0.85,
            },
          },
          firstSymbol(map),
        );
      }
      setReady(true);
    });
    map.on("click", (e) => void onMapClick(map, e));
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      fittedRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pins: move them as locations update; fit the view when pins appear or the count changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = points.map((p) =>
      new Marker({ element: pinElement(p), anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map),
    );
    if (points.length && points.length !== fittedRef.current) {
      fittedRef.current = points.length;
      if (points.length === 1) map.jumpTo({ center: [points[0]!.lng, points[0]!.lat], zoom: 14 });
      else {
        const b = new LngLatBounds();
        points.forEach((p) => b.extend([p.lng, p.lat]));
        map.fitBounds(b, { padding: 70, maxZoom: 15, duration: 0 });
      }
    }
  }, [points, ready]);

  // Fly to a pin when asked.
  useEffect(() => {
    const map = mapRef.current;
    if (!focusId || !map) return;
    const p = points.find((x) => x.id === (focusId.split(":")[0] ?? focusId));
    if (p) map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 15), duration: 900 });
  }, [focusId, points]);

  function toggleSatellite() {
    const map = mapRef.current;
    if (!map || !ready) return;
    const on = !satellite;
    if (on && !map.getSource("sat")) {
      const src = settings.arcgisKey ? ESRI(settings.arcgisKey) : EOX;
      map.addSource("sat", { type: "raster", tileSize: 256, ...src });
      // Under the labels, so street and place names stay readable on the photos.
      map.addLayer({ id: "sat", type: "raster", source: "sat" }, firstSymbol(map));
    }
    map.setLayoutProperty("sat", "visibility", on ? "visible" : "none");
    map.setLayoutProperty("building-3d", "visibility", on ? "none" : "visible");
    setSatellite(on);
  }

  function toggleTilt() {
    const map = mapRef.current;
    if (!map) return;
    const on = !tilted;
    map.easeTo({
      pitch: on ? 60 : 0,
      bearing: on ? -20 : 0,
      zoom: on ? Math.max(map.getZoom(), 15.5) : map.getZoom(),
      duration: 900,
    });
    setTilted(on);
  }

  function toggleStreet() {
    const map = mapRef.current;
    if (!map || !ready) return;
    const token = settings.mapillaryToken.trim();
    if (!token) {
      setNeedsKey((v) => !v);
      return;
    }
    const on = !street;
    if (on && !map.getSource("mly")) {
      map.addSource("mly", {
        type: "vector",
        tiles: [
          `https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=${encodeURIComponent(token)}`,
        ],
        minzoom: 6,
        maxzoom: 14,
        attribution: '<a href="https://www.mapillary.com" target="_blank">Mapillary</a>',
      });
      map.addLayer({
        id: "mly-seq",
        type: "line",
        source: "mly",
        "source-layer": "sequence",
        paint: { "line-color": MAPILLARY_GREEN, "line-width": 2, "line-opacity": 0.75 },
      });
      map.addLayer({
        id: "mly-img",
        type: "circle",
        source: "mly",
        "source-layer": "image",
        paint: {
          "circle-radius": 4,
          "circle-color": MAPILLARY_GREEN,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#fff",
        },
      });
    }
    for (const id of ["mly-seq", "mly-img"]) {
      map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    }
    streetRef.current = on;
    setStreet(on);
    if (!on) setPhoto(null);
  }

  /** Street photo mode: show the photo taken nearest to where you tapped. */
  async function onMapClick(map: MapLibre, e: MapMouseEvent) {
    if (!streetRef.current) return;
    const token = settings.mapillaryToken.trim();
    const headers = { Authorization: `OAuth ${token}` };
    setPhoto("loading");
    try {
      const hit = map.queryRenderedFeatures(e.point, { layers: ["mly-img"] })[0];
      let id = hit?.properties?.["id"] as string | number | undefined;
      if (id === undefined) {
        const d = 0.0004; // about 40 m around the tap
        const { lng, lat } = e.lngLat;
        const res = await fetch(
          `https://graph.mapillary.com/images?fields=id,geometry&limit=30&bbox=${lng - d},${lat - d},${lng + d},${lat + d}`,
          { headers },
        );
        const found = (
          (await res.json()) as {
            data?: { id: string; geometry: { coordinates: [number, number] } }[];
          }
        ).data;
        const nearest = (found ?? []).sort(
          (a, b) => dist(a.geometry.coordinates, e.lngLat) - dist(b.geometry.coordinates, e.lngLat),
        )[0];
        id = nearest?.id;
      }
      if (id === undefined) return setPhoto("none");
      const res = await fetch(
        `https://graph.mapillary.com/${id}?fields=thumb_1024_url,captured_at`,
        {
          headers,
        },
      );
      const info = (await res.json()) as { thumb_1024_url?: string; captured_at?: number };
      if (!info.thumb_1024_url) return setPhoto("none");
      setPhoto({
        id: String(id),
        url: info.thumb_1024_url,
        date: info.captured_at
          ? new Date(info.captured_at).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })
          : "",
      });
    } catch {
      setPhoto("none");
    }
  }

  if (failed) return <MiniMap points={points} focusId={focusId ?? null} height={height} />;

  const button = (on: boolean) =>
    `press flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold shadow-soft ${
      on ? "bg-primary text-primary-foreground" : "bg-card/95 text-foreground"
    }`;

  return (
    <div
      className="blublub-map-wrap relative overflow-hidden rounded-3xl border border-border shadow-soft"
      style={{ height, width: "100%", touchAction: "none" }}
    >
      <div ref={containerRef} className="size-full" />

      <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1.5">
        <button
          type="button"
          aria-pressed={satellite}
          onClick={toggleSatellite}
          className={button(satellite)}
        >
          <Layers className="size-3.5" /> {satellite ? "Satellite" : "Map"}
        </button>
        <button type="button" aria-pressed={tilted} onClick={toggleTilt} className={button(tilted)}>
          <Box className="size-3.5" /> 3D
        </button>
        <button
          type="button"
          aria-pressed={street}
          onClick={toggleStreet}
          className={button(street)}
        >
          <Camera className="size-3.5" /> Street photos
        </button>
      </div>

      {needsKey ? (
        <div className="absolute inset-x-2 bottom-9 z-10 rounded-2xl bg-card/95 p-3 text-xs shadow-soft">
          Street photos need a free Mapillary key. Add it in{" "}
          <Link to="/profile" className="font-bold text-primary underline">
            Profile &amp; Settings → Map
          </Link>
          .
        </div>
      ) : street && !photo ? (
        <p className="pointer-events-none absolute inset-x-2 bottom-9 z-10 rounded-full bg-card/90 px-3 py-1.5 text-center text-xs font-semibold shadow-soft">
          Tap a green line to see the street there
        </p>
      ) : null}

      {photo ? (
        <div className="absolute inset-x-2 bottom-9 z-10 overflow-hidden rounded-2xl bg-card shadow-float">
          {photo === "loading" ? (
            <div className="h-40 animate-pulse bg-muted" />
          ) : photo === "none" ? (
            <p className="p-3 text-xs">No street photo right there. Try tapping on a green line.</p>
          ) : (
            <>
              <img
                src={photo.url}
                alt="Street photo"
                className="block max-h-48 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="text-muted-foreground">{photo.date}</span>
                <a
                  href={`https://www.mapillary.com/app/?pKey=${photo.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-primary"
                >
                  Look around
                </a>
              </div>
            </>
          )}
          <button
            type="button"
            aria-label="Close street photo"
            onClick={() => setPhoto(null)}
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-card/90 shadow-soft"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function firstSymbol(map: MapLibre) {
  return map.getStyle().layers.find((l) => l.type === "symbol")?.id;
}

const dist = ([lng, lat]: [number, number], p: { lng: number; lat: number }) =>
  (lng - p.lng) ** 2 + (lat - p.lat) ** 2;

/** The same pin as the classic map: a name label over a dot. */
function pinElement(p: MapPoint) {
  const color = p.mine ? "hsl(330 70% 55%)" : "hsl(250 40% 45%)";
  const el = document.createElement("div");
  el.style.cssText = "display:flex;flex-direction:column;align-items:center;pointer-events:none";
  const label = document.createElement("span");
  label.textContent = p.label;
  label.style.cssText = `background:${p.mine ? color : "#fff"};color:${p.mine ? "#fff" : "#222"};border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:3px 8px;font:700 10px/1.2 system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.12)`;
  const dot = document.createElement("span");
  dot.style.cssText = `width:12px;height:12px;margin-top:-2px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.25)`;
  el.append(label, dot);
  return el;
}
