import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { MORE_LINKS, SoundToggle } from "@/components/MoreMenu";
import { useBadges } from "@/lib/badges";

export const Route = createFileRoute("/_authenticated/more")({
  head: () => ({
    meta: [
      { title: "More — BLUBLUB" },
      {
        name: "description",
        content: "Memories, daily questions, memory book and settings.",
      },
      { property: "og:title", content: "More — BLUBLUB" },
      {
        property: "og:description",
        content: "Memories, daily questions, memory book and settings.",
      },
    ],
  }),
  component: MorePage,
});

function MorePage() {
  const { data: badges } = useBadges();

  return (
    <AppLayout title="More" subtitle="Everything else" critter="seal">
      <ul className="grid grid-cols-2 gap-3">
        {MORE_LINKS.map((s) => (
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


      <SoundToggle className="card-soft mt-4 p-4" />
    </AppLayout>
  );
}
