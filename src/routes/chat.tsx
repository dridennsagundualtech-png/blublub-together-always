import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Private Chat — BLUBLUB" },
      { name: "description", content: "Real-time private messaging just for the two of you." },
      { property: "og:title", content: "Private Chat — BLUBLUB" },
      {
        property: "og:description",
        content: "Real-time private messaging just for the two of you.",
      },
    ],
  }),
  component: () => (
    <AppLayout title="Chat" subtitle="Just the two of you" critter="penguin">
      <div className="card-soft p-5 text-sm text-muted-foreground">
        Real-time chat turns on once Supabase is connected.
      </div>
    </AppLayout>
  ),
});
