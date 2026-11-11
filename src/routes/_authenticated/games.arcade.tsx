import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, Heart, Utensils } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Doodle } from "@/components/Doodles";
import { PixelEmoji } from "@/components/pixel-art";
import { SEAT_CRITTER } from "@/components/games/pixel-kit";
import { useBadges, useMarkSeen } from "@/lib/badges";
import { GAME_META, useGameHistory, useGames, useSeats, type GameKind } from "@/lib/games";
import { useSpicyAccess } from "@/lib/admin";
import { PixelSprite } from "@/arcade/PixelSprite";
import { ARCADE_GAMES } from "@/arcade/registry";
import { loadBest } from "@/arcade/scores";

export const Route = createFileRoute("/_authenticated/games/arcade")({
  head: () => ({
    meta: [
      { title: "Game corner — BLUBLUB" },
      {
        name: "description",
        content: "Play cosy two-player games together — the loser does the task you agreed on.",
      },
      { property: "og:title", content: "Game corner — BLUBLUB" },
      {
        property: "og:description",
        content: "Play cosy two-player games together — the loser does the task you agreed on.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArcadePage,
});

const KINDS: GameKind[] = ["tictactoe", "connect4", "memory", "rps", "war"];

/** A tiny still of each game, built from the same pixel pieces as the real boards. */
function Preview({ kind }: { kind: GameKind }): ReactNode {
  if (kind === "tictactoe") {
    // 0 = penguin (blue), 1 = seal (pink)
    const cells = [0, null, 1, null, 0, 1, null, null, 0];
    return (
      <span className="grid w-14 grid-cols-3 gap-0.5">
        {cells.map((c, i) => (
          <span key={i} className="px-cell">
            {c == null ? null : (
              <i
                className="size-2"
                style={{ background: c === 0 ? "var(--sky)" : "var(--primary)" }}
              />
            )}
          </span>
        ))}
      </span>
    );
  }
  if (kind === "connect4") {
    const cells = [null, null, null, 1, null, null, 1, 0, null, 1, 0, 0, 1, 0, 0, 0];
    return (
      <span className="px-tint-sky grid w-16 grid-cols-4 gap-0.5 p-1">
        {cells.map((c, i) => (
          <span key={i} className="px-slot">
            <i className="px-hole px-round" />
            {c == null ? null : <span className={`px-coin px-round px-coin--${c}`} />}
          </span>
        ))}
      </span>
    );
  }
  if (kind === "memory") {
    return (
      <span className="flex gap-1.5">
        <span className="px-card-back grid h-12 w-10 place-items-center">
          <PixelEmoji name="heart" size={16} />
        </span>
        <span className="px-card px-card--matched grid h-12 w-10 place-items-center">
          <Doodle critter="cat" pose="default" size={30} />
        </span>
      </span>
    );
  }
  if (kind === "rps") {
    return (
      <span className="flex items-end">
        <Doodle critter="cat" size={34} />
        <Doodle critter="seal" size={34} />
        <Doodle critter="penguin" size={34} />
      </span>
    );
  }
  return (
    <span className="flex gap-1.5">
      <span className="px-card px-card--win grid h-12 w-10 place-items-center text-xl font-bold">
        K
      </span>
      <span className="px-card grid h-12 w-10 place-items-center text-xl font-bold">7</span>
    </span>
  );
}

function ArcadePage() {
  useMarkSeen("games");
  const { data: badges } = useBadges();
  const { data: games } = useGames();
  const history = useGameHistory();
  const { nameOf, me, partnerId } = useSeats(null);
  const [showHistory, setShowHistory] = useState(false);
  const spicy = useSpicyAccess();
  // Arcade bests live on this device (see arcade/scores.ts); read them once the page is shown.
  const [bests, setBests] = useState<Record<string, number>>({});
  useEffect(() => {
    setBests(Object.fromEntries(ARCADE_GAMES.map((g) => [g.id, loadBest(g.id)])));
  }, []);

  const tally = history.reduce(
    (acc, g) => {
      if (g.is_draw) acc.draws += 1;
      else if (g.winner_id === me) acc.mine += 1;
      else if (g.winner_id) acc.theirs += 1;
      return acc;
    },
    { mine: 0, theirs: 0, draws: 0 },
  );
  const lead = tally.mine === tally.theirs ? null : tally.mine > tally.theirs ? "me" : "them";
  const inPlay = new Set((games ?? []).filter((g) => g.status === "playing").map((g) => g.kind));

  return (
    <AppLayout
      title="Game corner"
      subtitle="Winner picks, loser pays"
      critter="penguin"
      critterPose="wave"
    >
      <div className="pixel-zone">
        <Link to="/games" className="px-btn px-btn--ghost px-btn--small">
          <ArrowLeft className="size-4" /> Our Room
        </Link>

        {/* —— Lifetime scoreboard —— */}
        <h2 className="mb-2 mt-5 text-lg font-bold">Scoreboard</h2>
        <div className="px-frame px-tint-primary p-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 text-center">
            <div className="grid justify-items-center">
              <span className={lead === "me" ? "px-hop" : undefined}>
                <Doodle critter="penguin" pose={lead === "me" ? "cheer" : "default"} size={52} />
              </span>
              <p className="text-4xl font-bold leading-none tabular-nums">{tally.mine}</p>
              <p className="text-sm">You</p>
            </div>
            <div className="pb-1">
              <p className="text-xl font-bold leading-none tabular-nums">{tally.draws}</p>
              <p className="text-xs text-muted-foreground">draws</p>
            </div>
            <div className="grid justify-items-center">
              <span className={lead === "them" ? "px-hop" : undefined}>
                <Doodle critter="seal" pose={lead === "them" ? "cheer" : "default"} size={52} />
              </span>
              <p className="text-4xl font-bold leading-none tabular-nums">{tally.theirs}</p>
              <p className="max-w-full truncate text-sm">{nameOf(partnerId)}</p>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {history.length === 0
              ? "No games finished yet — pick one below"
              : `${history.length} two-player game${history.length === 1 ? "" : "s"} played`}
          </p>
        </div>

        {/* —— Two-player games —— */}
        <h2 className="mb-2 mt-6 text-lg font-bold">Play together</h2>
        <p className="-mt-1.5 mb-2 text-sm text-muted-foreground">
          Lock in a task first — the loser has to do it.
        </p>
        <ul className="grid grid-cols-2 gap-1.5">
          {KINDS.map((kind) => (
            <li key={kind} className={kind === "war" ? "col-span-2" : undefined}>
              <Link
                to="/games/$kind"
                params={{ kind }}
                className="px-frame px-tint-accent relative flex h-full flex-col items-center gap-1 p-3 text-center"
              >
                {badges?.gameKinds?.[kind] ? (
                  <span
                    className="px-chip px-blink absolute -right-1 -top-1 bg-destructive text-destructive-foreground"
                    aria-label="Needs you"
                  >
                    !
                  </span>
                ) : null}
                <span className="grid h-14 place-items-center" aria-hidden="true">
                  <Preview kind={kind} />
                </span>
                <span className="text-base font-bold leading-tight">{GAME_META[kind].label}</span>
                <span className="text-xs leading-snug opacity-80">{GAME_META[kind].blurb}</span>
                {inPlay.has(kind) ? <span className="px-chip mt-auto">IN PLAY</span> : null}
              </Link>
            </li>
          ))}
        </ul>

        {/* —— Solo arcade —— */}
        <h2 className="mb-2 mt-6 text-lg font-bold">Solo arcade</h2>
        <p className="-mt-1.5 mb-2 text-sm text-muted-foreground">
          Beat your own best. Scores stay on this phone.
        </p>
        <ul className="grid grid-cols-2 gap-1.5">
          {ARCADE_GAMES.map((game) => (
            <li key={game.id}>
              <Link
                to="/games/play/$game"
                params={{ game: game.id }}
                className="px-frame px-tint-sky flex h-full flex-col items-center gap-1 p-3 text-center"
              >
                <span className="grid h-14 place-items-center" aria-hidden="true">
                  <PixelSprite frames={game.icon} size={56} />
                </span>
                <span className="text-base font-bold leading-tight">{game.title}</span>
                <span className="text-xs leading-snug opacity-80">{game.blurb}</span>
                <span className="px-chip mt-auto">BEST {bests[game.id] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* —— Other things to do —— */}
        <h2 className="mb-2 mt-6 text-lg font-bold">Also here</h2>
        <ul className="grid gap-1.5">
          <li>
            <Link to="/food" className="px-frame flex items-center gap-3 p-3">
              <span className="px-tint-primary grid size-10 shrink-0 place-items-center">
                <Utensils className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold leading-tight">Food Roulette</span>
                <span className="block text-xs leading-snug text-muted-foreground">
                  Spin protein, method and flavour — no winners, just dinner
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
          {spicy ? (
            <li>
              <Link to="/spicy" className="px-frame flex items-center gap-3 p-3">
                <span className="px-tint-primary grid size-10 shrink-0 place-items-center">
                  <Heart className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold leading-tight">18+ Slots</span>
                  <span className="block text-xs leading-snug text-muted-foreground">
                    Premium · adults only
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ) : null}
        </ul>

        {/* —— History —— */}
        <div className="mb-2 mt-6 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Game history</h2>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
            className="px-btn px-btn--ghost px-btn--small"
          >
            {showHistory ? "Hide" : `Show (${history.length})`}
          </button>
        </div>
        {showHistory ? (
          history.length === 0 ? (
            <div className="px-frame grid justify-items-center gap-1 p-5 text-center">
              <Doodle critter="seal" pose="sleep" size={48} />
              <p className="text-sm text-muted-foreground">No games played yet — pick one above.</p>
            </div>
          ) : (
            <ul className="grid gap-1.5">
              {history.map((g) => {
                // The starter of a game plays the penguin, the other player the seal.
                const winnerSeat =
                  g.winner_id == null ? null : g.winner_id === g.created_by ? 0 : 1;
                return (
                  <li key={g.id} className="px-frame px-frame--flat flex items-center gap-3 p-3">
                    <span className="shrink-0" aria-hidden="true">
                      {winnerSeat == null ? (
                        <PixelEmoji name="hug" size={32} />
                      ) : (
                        <Doodle critter={SEAT_CRITTER[winnerSeat]} pose="cheer" size={36} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-base font-bold leading-tight">
                          {GAME_META[g.kind as GameKind]?.label ?? g.kind}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(g.finished_at ?? g.created_at).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="block break-words text-sm leading-snug text-muted-foreground">
                        {g.is_draw
                          ? "Draw — no task owed"
                          : `${nameOf(g.winner_id)} won · ${
                              g.winner_id === me ? nameOf(partnerId) : "you"
                            } owed: ${g.task}`}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </div>
    </AppLayout>
  );
}
