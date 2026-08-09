import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/diary")({
  head: () => ({
    meta: [
      { title: "Couple Diary — BLUBLUB" },
      { name: "description", content: "A shared journal with dated entries and mood tags." },
      { property: "og:title", content: "Couple Diary — BLUBLUB" },
      { property: "og:description", content: "A shared journal with dated entries and mood tags." },
    ],
  }),
  component: () => (
    <AppLayout title="Diary" subtitle="Your shared journal" critter="seal">
      <div className="card-soft p-5 text-sm text-muted-foreground">
        Waiting on the Supabase connection to load your entries.
      </div>
    </AppLayout>
  ),
});
