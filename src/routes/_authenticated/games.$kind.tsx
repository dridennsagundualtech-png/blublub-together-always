import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { GameShell } from "@/components/games/GameShell";
import { GAME_REGISTRY, isGameKind } from "@/components/games/registry";
import { GAME_META, type GameKind } from "@/lib/games";

export const Route = createFileRoute("/_authenticated/games/$kind")({
  beforeLoad: ({ params }) => {
    if (!isGameKind(params.kind)) throw notFound();
  },
  head: ({ params }) => {
    const meta = GAME_META[params.kind as GameKind];
    const title = `${meta?.label ?? "Game"} — BLUBLUB`;
    const description = meta?.blurb ?? "A cosy two-player game for the two of you.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <AppLayout title="Not found" subtitle="No such game" critter="seal">
      <p className="card-soft p-5 text-sm text-muted-foreground">That game doesn't exist.</p>
    </AppLayout>
  ),
  errorComponent: ({ error }) => (
    <AppLayout title="Games" subtitle="Something went wrong" critter="seal">
      <div className="card-soft space-y-2 p-5">
        <p className="text-sm text-muted-foreground">
          We couldn't load that game. Please try again.
        </p>
        <p className="break-words text-xs text-muted-foreground/80">{error?.message}</p>
        <Link to="/games" className="press inline-block text-xs font-bold text-primary">
          Back to games
        </Link>
      </div>
    </AppLayout>
  ),
  component: GameRoute,
});

function GameRoute() {
  const { kind } = Route.useParams();
  const meta = GAME_META[kind as GameKind];
  const entry = isGameKind(kind) ? GAME_REGISTRY[kind] : null;

  if (!entry || !meta) {
    return (
      <AppLayout title="Not found" subtitle="No such game" critter="seal">
        <p className="card-soft p-5 text-sm text-muted-foreground">That game doesn't exist.</p>
      </AppLayout>
    );
  }

  const View = entry.view;

  return (
    <AppLayout title={meta.label} subtitle={meta.blurb} critter="cat">
      <Link to="/games" className="press mb-3 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
        <ArrowLeft className="size-3.5" /> All games
      </Link>
      <GameShell kind={kind as GameKind} newState={entry.newState}>
        {(props) => <View {...props} />}
      </GameShell>
    </AppLayout>
  );
}
