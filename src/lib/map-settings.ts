import { useCallback, useState } from "react";

/** Which map "Where we are" uses, plus the person's own free keys. Kept on this device. */
export type MapKind = "classic" | "3d";
export type MapSettings = {
  kind: MapKind;
  /** ArcGIS Location Platform key: sharper satellite photos (free tier). */
  arcgisKey: string;
  /** Mapillary client token: street-level photos (free account). */
  mapillaryToken: string;
};

const KEY = "blublub:map";
const DEFAULTS: MapSettings = { kind: "classic", arcgisKey: "", mapillaryToken: "" };

export function loadMapSettings(): MapSettings {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<MapSettings>;
    return { ...DEFAULTS, ...saved };
  } catch {
    return DEFAULTS;
  }
}

export function useMapSettings() {
  const [settings, setSettings] = useState<MapSettings>(loadMapSettings);
  const update = useCallback((patch: Partial<MapSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage blocked: the choice lasts until the app is closed */
      }
      return next;
    });
  }, []);
  return [settings, update] as const;
}
