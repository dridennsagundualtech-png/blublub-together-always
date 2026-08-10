import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { GameShell } from "@/components/games/GameShell";
import { TicTacToe, newTicTacToe } from "@/components/games/TicTacToe";
import { Rps, newRps } from "@/components/games/Rps";
import { Memory, newMemory } from "@/components/games/Memory";
import { ConnectFour, newConnect4 } from "@/components/games/ConnectFour";
import { War, newWar } from "@/components/games/War";
import { GAME_META, type GameKind } from "@/lib/games";
import type { GameViewProps } from "@/components/games/GameShell";

const REGISTRY: Record<
  GameKind,
  { view: (p: GameViewProps) => React.ReactElement; newState: () => unknown }
> = {
  tictactoe: { view: TicTacToe, newState: newTicTacToe },
  rps: { view: Rps, newState: newRps },
  memory: { view: Memory, newState: newMemory },
  connect4: { view: ConnectFour, newState: newConnect4 },
  war: { view: War, newState: newWar },
};

export const Route = createFileRoute("/_authenticated/games/$kind")({
  beforeLoad: ({ params }) => {
    if (!(params.kind in REGISTRY)) throw notFound();
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
  errorComponent: () => (
    <AppLayout title="Games" subtitle="Something went wrong" critter="seal">
      <p className="card-soft p-5 text-sm text-muted-foreground">
        We couldn't load that game. Please try again.
      </p>
    </AppLayout>
  ),
  component: GameRoute,
});

function GameRoute() {
  const { kind } = Route.useParams();
  const entry = REGISTRY[kind as GameKind]!;
  const meta = GAME_META[kind as GameKind]!;
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
