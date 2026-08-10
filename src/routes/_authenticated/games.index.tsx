import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Dices, Grid3x3, Hand, Layers, Utensils, Sparkles, Heart } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, EmptyState, SectionTitle } from "@/components/ui-kit";
import { GAME_META, useGameHistory, useSeats, type GameKind } from "@/lib/games";

export const Route = createFileRoute("/_authenticated/games")({
  head: () => ({
    meta: [
      { title: "Games — BLUBLUB" },
      {
        name: "description",
        content: "Play cosy two-player games together — the loser does the task you agreed on.",
      },
      { property: "og:title", content: "Games — BLUBLUB" },
      {
        property: "og:description",
        content: "Play cosy two-player games together — the loser does the task you agreed on.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GamesPage,
});

const GAMES: { kind: GameKind; icon: typeof Grid3x3 }[] = [
  { kind: "tictactoe", icon: Grid3x3 },
  { kind: "rps", icon: Hand },
  { kind: "memory", icon: Layers },
  { kind: "connect4", icon: Dices },
  { kind: "war", icon: Sparkles },
];

function GamesPage() {
  const history = useGameHistory();
  const { nameOf, me } = useSeats(null);

  return (
    <AppLayout title="Games" subtitle="Winner picks, loser pays" critter="penguin" critterPose="wave">
      <SectionTitle>Loser-task games</SectionTitle>
      <ul className="space-y-2">
        {GAMES.map(({ kind, icon: Icon }) => (
          <li key={kind}>
            <Link
              to="/games/$kind"
              params={{ kind }}
              className="press card-soft flex items-center gap-3 p-4"
            >
              <span className="grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{GAME_META[kind].label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {GAME_META[kind].blurb}
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <SectionTitle>Also here</SectionTitle>
      <ul className="space-y-2">
        <li>
          <Link to="/food" className="press card-soft flex items-center gap-3 p-4">
            <span className="grid size-10 place-items-center rounded-full bg-secondary">
              <Utensils className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Food Roulette</span>
              <span className="block truncate text-xs text-muted-foreground">
                Spin protein, method and flavour — no winners, just dinner
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link to="/spicy" className="press card-soft flex items-center gap-3 p-4">
            <span className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary">
              <Heart className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">18+ Dice</span>
              <span className="block truncate text-xs text-muted-foreground">
                Premium · adults only
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
      </ul>

      <SectionTitle>Game history</SectionTitle>
      {history.length === 0 ? (
        <EmptyState text="No games played yet — pick one above." />
      ) : (
        <ul className="space-y-2">
          {history.map((g) => (
            <li key={g.id}>
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold">{GAME_META[g.kind as GameKind]?.label ?? g.kind}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(g.finished_at ?? g.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {g.is_draw
                    ? "Draw — no task owed"
                    : `${nameOf(g.winner_id)} won · ${
                        g.winner_id === me ? "partner" : "you"
                      } owed: ${g.task}`}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
