import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PremiumGate } from "@/components/PremiumGate";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({
    meta: [
      { title: "Shared Budget — BLUBLUB" },
      { name: "description", content: "Track shared expenses, balances and savings goals." },
      { property: "og:title", content: "Shared Budget — BLUBLUB" },
      {
        property: "og:description",
        content: "Track shared expenses, balances and savings goals.",
      },
    ],
  }),
  component: () => (
    <AppLayout title="Budget" subtitle="Money, together" critter="cat">
      <PremiumGate unlocked={false} title="Budget Tracker is Premium">
        <div />
      </PremiumGate>
    </AppLayout>
  ),
});
