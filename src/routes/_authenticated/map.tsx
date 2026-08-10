import { createFileRoute } from "@tanstack/react-router";
import { MapPin, MapPinOff } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { MiniMap, type MapPoint } from "@/components/MiniMap";
import { Card, SectionTitle } from "@/components/ui-kit";
import { useLocationPublisher, useLocations, timeAgo } from "@/lib/location";
import { useAuthUser, useMembers, useProfile } from "@/lib/session";

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

function MapPage() {
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const { data: members } = useMembers();
  const { data: locations } = useLocations();
  const locationStatus = useLocationPublisher();


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

  return (
    <AppLayout title="Where we are" subtitle="Only when you both opt in" critter="penguin" critterPose="curious">
      <MiniMap points={points} />

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
                      sharing && loc ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {sharing && loc ? <MapPin className="size-5" /> : <MapPinOff className="size-5" />}
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
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 pb-4 text-center text-xs text-muted-foreground">
        Turn your own sharing on or off in Profile &amp; Settings. Updates happen while the app is
        open.
      </p>
    </AppLayout>
  );
}
