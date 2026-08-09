import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useSoundSetting } from "@/hooks/use-sound";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More — BLUBLUB" },
      {
        name: "description",
        content: "Goals, to-dos, date planner, period tracking and settings.",
      },
      { property: "og:title", content: "More — BLUBLUB" },
      {
        property: "og:description",
        content: "Goals, to-dos, date planner, period tracking and settings.",
      },
    ],
  }),
  component: MorePage,
});

const SECTIONS = [
  "To-dos & Goals",
  "Date Night Planner",
  "Photo Timeline",
  "Daily Questions",
  "Period Tracking",
  "Profile & Settings",
];

function MorePage() {
  const { enabled, setEnabled } = useSoundSetting();

  return (
    <AppLayout title="More" subtitle="Everything else" critter="seal">
      <ul className="space-y-3">
        {SECTIONS.map((s) => (
          <li key={s} className="card-soft press p-4 text-sm font-semibold">
            {s}
          </li>
        ))}
      </ul>

      <div className="card-soft mt-4 flex items-center justify-between p-4">
        <span className="text-sm font-semibold">Sound effects</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(!enabled)}
          className={`press h-7 w-12 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
        >
          <span
            className={`block size-6 rounded-full bg-card shadow-soft transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
      </div>
    </AppLayout>
  );
}
