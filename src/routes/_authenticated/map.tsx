import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crosshair, ExternalLink, Heart, MapPin, MapPinOff, Navigation } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { MiniMap, type MapPoint } from "@/components/MiniMap";
import { Card, SectionTitle } from "@/components/ui-kit";
import { useLocationPublisher, useLocations, timeAgo } from "@/lib/location";
import { useAuthUser, useMembers, usePartner, useProfile } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "Where We Are — BLUBLUB" },
      {
        name: "description",
        content: "See each other on a map — only while you each choose to share.",
      },
      { property: "og:title", content: "Where We Are — BLUBLUB" },
      {
        property: "og:description",
        content: "See each other on a map — only while you each choose to share.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function openExternalMaps(lat: number, lng: number, label: string) {
  const q = encodeURIComponent(`${lat},${lng}`);
  const isApple =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  const url = isApple
    ? `https://maps.apple.com/?q=${encodeURIComponent(label)}&ll=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  window.open(url, "_blank", "noopener,noreferrer");
}


/** 5-heart gauge: fuller when you are closer. */
function DistanceHearts({ km }: { km: number }) {
  // 5 hearts ≈ within ~0.2 km; 1 heart ≈ 50+ km
  let filled = 1;
  if (km < 0.2) filled = 5;
  else if (km < 1) filled = 4;
  else if (km < 5) filled = 3;
  else if (km < 25) filled = 2;
  else filled = 1;

  let label: string;
  if (km < 1) label = `${Math.round(km * 1000)} m apart`;
  else if (km < 10) label = `${km.toFixed(1)} km apart`;
  else label = `${Math.round(km)} km apart`;

  return (
    <div className="card-soft mt-3 flex flex-col items-center gap-2 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Closeness
      </p>
      <div className="flex items-center gap-1.5" aria-label={`${filled} of 5 hearts`}>
        {Array.from({ length: 5 }, (_, i) => {
          const on = i < filled;
          return (
            <Heart
              key={i}
              className={
                on
                  ? "size-6 fill-primary text-primary"
                  : "size-6 text-muted-foreground/40"
              }
              strokeWidth={on ? 0 : 1.75}
            />
          );
        })}
      </div>
      <p className="text-xs font-bold text-primary">{label}</p>
    </div>
  );
}

function MapPage() {
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const { data: members } = useMembers();
  const partner = usePartner();
  const { data: locations } = useLocations();
  const locationStatus = useLocationPublisher();
  const [focusId, setFocusId] = useState<string | null>(null);

  const rows = members ?? [];
  const points: MapPoint[] = rows.flatMap((m) => {
    const loc = locations?.find((l) => l.user_id === m.id);
    if (!loc) return [];
    return [
      {
        id: m.id,
        lat: loc.lat,
        lng: loc.lng,
        label: m.id === user?.id ? "You" : (m.display_name ?? "Partner"),
        mine: m.id === user?.id,
      },
    ];
  });

  const me = points.find((p) => p.mine);
  const them = points.find((p) => !p.mine);


  return (
    <AppLayout
      title="Where we are"
      subtitle="Only when you both opt in"
      critter="penguin"
      critterPose="curious"
    >
      <MiniMap points={points} focusId={focusId} height={340} />

      {/* Map controls */}
      {points.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {me ? (
            <button
              type="button"
              onClick={() => setFocusId(me.id + ":" + Date.now())}
              className="press inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold"
            >
              <Crosshair className="size-3.5" />
              Center on me
            </button>
          ) : null}
          {them ? (
            <button
              type="button"
              onClick={() => setFocusId(them.id + ":" + Date.now())}
              className="press inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold"
            >
              <Navigation className="size-3.5" />
              Center on {partner?.display_name ?? "partner"}
            </button>
          ) : null}
          {them ? (
            <button
              type="button"
              onClick={() => openExternalMaps(them.lat, them.lng, them.label)}
              className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
            >
              <ExternalLink className="size-3.5" />
              Navigate there
            </button>
          ) : null}
        </div>
      ) : null}

      {me && them ? (
        <DistanceHearts km={haversineKm(me, them)} />
      ) : null}

      {locationStatus ? (
        <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
          {locationStatus}
        </p>
      ) : null}

      <SectionTitle>Pins</SectionTitle>
      <ul className="space-y-2">
        {rows.map((m) => {
          const loc = locations?.find((l) => l.user_id === m.id);
          const mine = m.id === user?.id;
          const sharing = mine ? !!profile?.share_location : !!m.share_location;
          return (
            <li key={m.id}>
              <Card>
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-10 place-items-center rounded-full ${
                      sharing && loc
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {sharing && loc ? (
                      <MapPin className="size-5" />
                    ) : (
                      <MapPinOff className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {mine ? "You" : (m.display_name ?? "Partner")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {loc
                        ? `Updated ${timeAgo(loc.updated_at)}`
                        : sharing
                          ? mine
                            ? "Sharing is on — waiting for your first location fix"
                            : "Sharing is on — waiting for them to open the app and allow location"
                          : "Sharing is off — location unavailable"}
                    </p>
                  </div>
                  {loc && !mine ? (
                    <button
                      type="button"
                      aria-label="Navigate"
                      onClick={() =>
                        openExternalMaps(
                          loc.lat,
                          loc.lng,
                          m.display_name ?? "Partner",
                        )
                      }
                      className="press grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
                    >
                      <Navigation className="size-4" />
                    </button>
                  ) : null}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 pb-4 text-center text-xs text-muted-foreground">
        Turn your own sharing on or off in Profile &amp; Settings. Updates happen while the app is
        open. Pinch or drag the map to explore.
      </p>
    </AppLayout>
  );
}
