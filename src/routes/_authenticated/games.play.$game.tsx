import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ArcadeCabinet } from "@/arcade/ArcadeCabinet";
import { arcadeGame } from "@/arcade/registry";
import type { ArcadeSound } from "@/arcade/engine/types";
import { playChirp } from "@/hooks/use-sound";

/** Solo arcade games. Everything runs on the device; nothing here reads or writes the database. */
export const Route = createFileRoute("/_authenticated/games/play/$game")({
  beforeLoad: ({ params }) => {
    if (!arcadeGame(params.game)) throw notFound();
  },
  head: ({ params }) => {
    const game = arcadeGame(params.game);
    const title = `${game?.title ?? "Arcade"} — BLUBLUB`;
    const description = game?.blurb ?? "A little pixel arcade game.";
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
  notFoundComponent: NoSuchGame,
  component: PlayRoute,
});

function NoSuchGame() {
  return (
    <AppLayout title="Not found" subtitle="No such game" critter="seal" requireCouple={false}>
      <div className="card-soft space-y-2 p-5">
        <p className="text-sm text-muted-foreground">That game doesn't exist.</p>
        <Link to="/games/arcade" className="press inline-block text-xs font-bold text-primary">
          Back to games
        </Link>
      </div>
    </AppLayout>
  );
}

/** The app's sound switch decides whether a cue is heard. */
const playCue = (sound: ArcadeSound) => playChirp(sound === "best" ? "win" : sound);

/** Marks the page while a run is on; pixel.css uses it to hide the floating chat button. */
function markPlaying(playing: boolean) {
  if (playing) document.documentElement.dataset["arcadePlaying"] = "1";
  else delete document.documentElement.dataset["arcadePlaying"];
}

function PlayRoute() {
  const { game: id } = Route.useParams();
  const game = arcadeGame(id);
  if (!game) return <NoSuchGame />;

  return (
    // Solo games need no partner, so they also work before pairing and signed out.
    <AppLayout title={game.title} subtitle={game.blurb} critter="cat" requireCouple={false}>
      <Link
        to="/games/arcade"
        className="press mb-3 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"
      >
        <ArrowLeft className="size-3.5" /> All games
      </Link>
      <ArcadeCabinet
        // A different game is a different cabinet: remount so nothing carries over.
        key={game.id}
        game={game}
        onSound={playCue}
        onPlayingChange={markPlaying}
        exit={
          <Link to="/games/arcade" className="px-btn px-btn--ghost">
            All games
          </Link>
        }
      />
      <p className="arcade-hint pixel-zone">Best scores are saved on this phone only.</p>
    </AppLayout>
  );
}
