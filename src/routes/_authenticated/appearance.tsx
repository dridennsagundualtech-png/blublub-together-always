import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ThemeEditor } from "@/components/ThemeEditor";

export const Route = createFileRoute("/_authenticated/appearance")({
  head: () => ({
    meta: [
      { title: "Appearance — BLUBLUB" },
      {
        name: "description",
        content: "Pick your shared colors and choose which screens use a gradient.",
      },
      { property: "og:title", content: "Appearance — BLUBLUB" },
      {
        property: "og:description",
        content: "Pick your shared colors and choose which screens use a gradient.",
      },
    ],
  }),
  component: AppearancePage,
});

function AppearancePage() {
  return (
    <AppLayout title="Appearance" subtitle="Our colors & gradients" critter="cat">
      <ThemeEditor compact />
    </AppLayout>
  );
}
