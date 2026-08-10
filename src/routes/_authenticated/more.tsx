import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarHeart,
  HelpCircle,
  Images,
  ListChecks,
  UserCog,
  ChevronRight,
  Sparkles,
  BookHeart,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useSoundSetting } from "@/hooks/use-sound";
import { useBadges } from "@/lib/badges";

export const Route = createFileRoute("/_authenticated/more")({
  head: () => ({
    meta: [
      { title: "More — BLUBLUB" },
      {
        name: "description",
        content: "Goals, to-dos, date planner, map, bucket list, cool-down and settings.",
      },
      { property: "og:title", content: "More — BLUBLUB" },
      {
        property: "og:description",
        content: "Goals, to-dos, date planner, map, bucket list, cool-down and settings.",
      },
    ],
  }),
  component: MorePage,
});

const SECTIONS = [
  { to: "/diary", label: "Couple Diary", icon: BookHeart, tint: "tile-lilac" },
  { to: "/todos", label: "To-dos & Goals", icon: ListChecks, tint: "tile-pink" },
  { to: "/bucket", label: "Bucket List", icon: Sparkles, tint: "tile-lilac" },
  { to: "/dates", label: "Date Night Planner", icon: CalendarHeart, tint: "tile-peach" },
  { to: "/photos", label: "Photo Timeline", icon: Images, tint: "tile-sky" },
  { to: "/questions", label: "Daily Questions", icon: HelpCircle, badge: "question", tint: "tile-lilac" },
  { to: "/memory-book", label: "Memory Book (PDF)", icon: BookHeart, tint: "tile-pink" },
  { to: "/profile", label: "Profile & Settings", icon: UserCog, tint: "tile-cream" },
] as const;

function MorePage() {
  const { enabled, setEnabled } = useSoundSetting();
  const { data: badges } = useBadges();

  return (
    <AppLayout title="More" subtitle="Everything else" critter="seal">
      <ul className="grid grid-cols-2 gap-3">
        {SECTIONS.map((s) => (
          <li key={s.to}>
            <Link
              to={s.to}
              className="card-soft press relative flex h-full flex-col gap-3 p-4 text-sm font-semibold"
            >
              <span className={`grid size-11 place-items-center rounded-2xl ${s.tint} text-primary`}>
                <s.icon className="size-5" />
              </span>
              <span className="leading-snug">{s.label}</span>
              {"badge" in s && badges?.question ? (
                <span className="absolute right-3 top-3 size-2.5 rounded-full bg-destructive" />
              ) : (
                <ChevronRight className="absolute right-3 top-3 size-4 text-muted-foreground" />
              )}
            </Link>
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
