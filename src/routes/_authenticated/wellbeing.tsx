import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Droplets, HeartHandshake, MapPin } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, SectionTitle } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/wellbeing")({
  head: () => ({
    meta: [
      { title: "Partner's Wellbeing — BLUBLUB" },
      {
        name: "description",
        content: "Cool-down tool, cycle tracking and live location in one caring space.",
      },
      { property: "og:title", content: "Partner's Wellbeing — BLUBLUB" },
      {
        property: "og:description",
        content: "Cool-down tool, cycle tracking and live location in one caring space.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WellbeingPage,
});

const SECTIONS = [
  {
    to: "/cooldown",
    label: "Cool-Down Tool",
    hint: "Pause, name the feeling, reconnect",
    icon: HeartHandshake,
    tint: "tile-sky",
  },
  {
    to: "/period",
    label: "Cycle Tracking",
    hint: "Phase & next predicted date",
    icon: Droplets,
    tint: "tile-peach",
  },
  {
    to: "/map",
    label: "Where We Are",
    hint: "Live location, when shared",
    icon: MapPin,
    tint: "tile-cream",
  },
] as const;

function WellbeingPage() {
  return (
    <AppLayout title="Wellbeing" subtitle="Taking care of each other" critter="seal">
      <Card className="text-sm text-muted-foreground">
        Everything for checking in on each other — cool down after a rough moment, follow the cycle
        together, and see where you both are.
      </Card>

      <SectionTitle>Care tools</SectionTitle>
      <ul className="space-y-3">
        {SECTIONS.map((s) => (
          <li key={s.to}>
            <Link
              to={s.to}
              className="card-soft press flex items-center gap-3 p-4"
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${s.tint} text-primary`}>
                <s.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{s.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </AppLayout>
  );
}
