import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Shared Calendar — BLUBLUB" },
      { name: "description", content: "Plan dates, events and anniversaries together." },
      { property: "og:title", content: "Shared Calendar — BLUBLUB" },
      { property: "og:description", content: "Plan dates, events and anniversaries together." },
    ],
  }),
  component: () => (
    <AppLayout title="Calendar" subtitle="Dates & anniversaries" critter="penguin">
      <div className="card-soft p-5 text-sm text-muted-foreground">
        Waiting on the Supabase connection to load your shared events.
      </div>
    </AppLayout>
  ),
});
