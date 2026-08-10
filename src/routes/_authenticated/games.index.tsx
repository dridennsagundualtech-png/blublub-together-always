import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Dices, Grid3x3, Hand, Layers, Utensils, Sparkles, Heart } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, EmptyState, SectionTitle, StatCard } from "@/components/ui-kit";
import { useBadges, useMarkSeen } from "@/lib/badges";
import { GAME_META, useGameHistory, useSeats, type GameKind } from "@/lib/games";


export const Route = createFileRoute("/_authenticated/games/")({
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
  useMarkSeen("games");
  const { data: badges } = useBadges();
  const history = useGameHistory();
  const { nameOf, me } = useSeats(null);


  const tally = history.reduce(
    (acc, g) => {
      if (g.is_draw) acc.draws += 1;
      else if (g.winner_id === me) acc.mine += 1;
      else if (g.winner_id) acc.theirs += 1;
      return acc;
    },
    { mine: 0, theirs: 0, draws: 0 },
  );

  return (
    <AppLayout title="Games" subtitle="Winner picks, loser pays" critter="penguin" critterPose="wave">
      <SectionTitle>Lifetime scoreboard</SectionTitle>
      <StatCard>
        <div className="grid grid-cols-3 text-center">
          <div>
            <p className="text-2xl font-extrabold text-primary">{tally.mine}</p>
            <p className="text-xs text-muted-foreground">You</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-muted-foreground">{tally.draws}</p>
            <p className="text-xs text-muted-foreground">Draws</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-primary">{tally.theirs}</p>
            <p className="truncate text-xs text-muted-foreground">
              {history.find((g) => g.winner_id && g.winner_id !== me)
                ? nameOf(history.find((g) => g.winner_id && g.winner_id !== me)!.winner_id)
                : "Partner"}
            </p>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Across all five games · {history.length} played
        </p>
      </StatCard>

      <SectionTitle>Loser-task games</SectionTitle>
      <ul className="space-y-2">
        {GAMES.map(({ kind, icon: Icon }) => (
          <li key={kind}>
            <Link
              to="/games/$kind"
              params={{ kind }}
              className="press card-soft flex items-center gap-3 p-4"
            >
              <span className="relative grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
                <Icon className="size-5" />
                {badges?.gameKinds?.[kind] ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card" />
                ) : null}
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

      <SectionTitle
        action={
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="press rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold"
          >
            {showHistory ? "Hide" : `Show (${history.length})`}
          </button>
        }
      >
        Game history
      </SectionTitle>
      {showHistory ? (
        history.length === 0 ? (
          <EmptyState text="No games played yet — pick one above." />
        ) : (
          <ul className="space-y-2">
            {history.map((g) => (
              <li key={g.id}>
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold">
                      {GAME_META[g.kind as GameKind]?.label ?? g.kind}
                    </p>
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
        )
      ) : null}

    </AppLayout>
  );
}
