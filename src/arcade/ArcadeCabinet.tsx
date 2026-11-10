import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { PixelSprite } from "@/arcade/PixelSprite";
import { attachInput, type InputSource } from "@/arcade/engine/input";
import { startLoop } from "@/arcade/engine/loop";
import type { AnyArcadeGame, ArcadeSound } from "@/arcade/engine/types";
import { loadBest, saveBest } from "@/arcade/scores";

type Phase = "ready" | "playing" | "paused" | "over";

const newSeed = () => (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;

/**
 * Hosts one arcade game: the screen, the title / pause / game-over menus, the score and the
 * best score. This is the only place where a game meets React and the page.
 *
 * `onSound` lets the app play (or mute) the game's sound cues; `exit` is an optional link
 * shown on the game-over menu (e.g. back to the list of games).
 * Before a run starts the game plays itself as a silent demo behind the title.
 */
export function ArcadeCabinet({
  game,
  onSound,
  onPlayingChange,
  exit,
}: {
  game: AnyArcadeGame;
  onSound?: (sound: ArcadeSound) => void;
  /** Told whenever a run starts or stops, so the app can clear the screen of distractions. */
  onPlayingChange?: (playing: boolean) => void;
  exit?: ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<unknown>(null);
  const inputRef = useRef<InputSource | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const soundRef = useRef(onSound);
  soundRef.current = onSound;

  const [phase, setPhaseState] = useState<Phase>("ready");
  const [best, setBest] = useState(0);
  const [result, setResult] = useState<{
    score: number;
    newBest: boolean;
    stats: { label: string; value: string }[];
  } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  useEffect(() => {
    setBest(loadBest(game.id));
  }, [game.id]);

  const playing = phase === "playing";
  const playingChangeRef = useRef(onPlayingChange);
  playingChangeRef.current = onPlayingChange;
  useEffect(() => {
    playingChangeRef.current?.(playing);
    return () => {
      if (playing) playingChangeRef.current?.(false);
    };
  }, [playing]);

  // —— fit the screen: as wide as the column allows, never taller than the space on screen ——
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => {
      const column = frame.clientWidth - 12; // the cabinet's own padding
      const room = Math.max(220, window.innerHeight - 300); // header, bars, hint, tab bar
      let scale = Math.min(column / game.width, room / game.height);
      // Whole-number scales give perfectly even pixels; use one when it costs little size.
      const whole = Math.floor(scale);
      if (whole >= 2 && whole / scale > 0.9) scale = whole;
      setSize({ w: Math.floor(game.width * scale), h: Math.floor(game.height * scale) });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [game.width, game.height]);

  /**
   * Begin a fresh run. Started from a menu button we forget any held input; started by tapping
   * the screen we keep it, so that same tap already steers (or flaps).
   */
  const start = useCallback(
    (keepInput = false) => {
      stateRef.current = game.create(newSeed());
      if (!keepInput) inputRef.current?.reset();
      setResult(null);
      setPhase("playing");
    },
    [game, setPhase],
  );

  // —— the game loop: draws always (menus are animated), advances the rules only while playing ——
  useEffect(() => {
    const canvas = canvasRef.current;
    const screen = screenRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !screen || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    stateRef.current = game.create(newSeed());
    setPhase("ready");
    setResult(null);

    let frame = 0;
    // With "reduce motion" on, the title screen stays still instead of playing a demo.
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const input = attachInput(screen, () => {
      if (phaseRef.current === "ready") start(true);
    });
    inputRef.current = input;

    const stop = startLoop(
      () => {
        frame += 1;
        const pressed = input.read();
        if (phaseRef.current === "ready" && game.demo && !calm) {
          // Title screen: the game plays itself, silently, like an arcade cabinet.
          const demo = stateRef.current;
          game.step(demo, game.demo(demo));
          game.takeSounds(demo);
          if (game.status(demo).over) stateRef.current = game.create(newSeed());
          return;
        }
        if (phaseRef.current !== "playing") return;
        const state = stateRef.current;
        game.step(state, pressed);
        for (const sound of game.takeSounds(state)) soundRef.current?.(sound);
        const status = game.status(state);
        if (status.over) {
          const before = loadBest(game.id);
          const newBest = status.score > before;
          if (newBest) soundRef.current?.("best");
          setBest(saveBest(game.id, status.score));
          setResult({ score: status.score, newBest, stats: game.stats?.(state) ?? [] });
          setPhase("over");
        }
      },
      () => game.render(ctx, stateRef.current, frame, phaseRef.current !== "ready"),
    );

    // Pause when the app goes to the background, so nobody loses a run to a phone call.
    const onHide = () => {
      if (document.hidden && phaseRef.current === "playing") {
        input.reset();
        setPhase("paused");
      }
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      stop();
      input.dispose();
      inputRef.current = null;
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [game, setPhase, start]);

  const pause = () => {
    inputRef.current?.reset();
    setPhase("paused");
  };
  const resume = () => {
    inputRef.current?.reset();
    setPhase("playing");
  };

  return (
    <div className="pixel-zone" ref={frameRef}>
      <div className="px-frame arcade-cabinet">
        <div className="arcade-bar">
          <span>
            BEST <span className="tabular-nums">{best}</span>
          </span>
          <span className="truncate opacity-70">{game.title}</span>
          <button
            type="button"
            className="px-btn px-btn--ghost px-btn--small"
            onClick={phase === "paused" ? resume : pause}
            disabled={phase !== "playing" && phase !== "paused"}
            aria-label={phase === "paused" ? "Resume" : "Pause"}
          >
            {phase === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
        </div>

        <div
          ref={screenRef}
          className="arcade-screen"
          data-no-page-swipe
          style={
            size
              ? { width: size.w, height: size.h }
              : { aspectRatio: `${game.width} / ${game.height}` }
          }
        >
          <canvas
            ref={canvasRef}
            width={game.width}
            height={game.height}
            role="img"
            aria-label={`${game.title} game screen`}
          />

          {phase === "ready" ? (
            <div className="arcade-overlay arcade-overlay--title">
              <p className="px-title mt-4 text-4xl">{game.title}</p>
              <div className="arcade-panel mt-auto">
                <ul className="space-y-1 text-left text-sm leading-snug">
                  {game.howTo.map((line) => (
                    <li key={line} className="flex gap-1.5">
                      <span aria-hidden="true">▸</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="px-blink mt-2 text-lg font-bold">TAP TO START</p>
              </div>
            </div>
          ) : null}

          {phase === "paused" ? (
            <div className="arcade-overlay arcade-overlay--dim">
              <div className="arcade-panel px-pop-in">
                <p className="text-2xl font-bold">Paused</p>
                <div className="mt-3 grid gap-1">
                  <button type="button" className="px-btn" onClick={resume} autoFocus>
                    <Play className="size-4" /> Resume
                  </button>
                  <button type="button" className="px-btn px-btn--ghost" onClick={() => start()}>
                    <RotateCcw className="size-4" /> Start over
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {phase === "over" && result ? (
            <div className="arcade-overlay arcade-overlay--dim" role="status" aria-live="polite">
              <div className="arcade-panel px-pop-in">
                <div className="flex items-center justify-center gap-2">
                  <PixelSprite frames={game.icon} size={40} />
                  <p className="text-2xl font-bold">{result.newBest ? "New best!" : "Game over"}</p>
                </div>
                <p className="arcade-score mt-2 text-5xl font-bold tabular-nums">{result.score}</p>
                <p className="text-sm text-muted-foreground">
                  {game.unit} · best {best}
                </p>
                {result.stats.length ? (
                  <dl className="mt-2 flex justify-center gap-4 text-sm">
                    {result.stats.map((stat) => (
                      <div key={stat.label}>
                        <dt className="text-muted-foreground">{stat.label}</dt>
                        <dd className="font-bold">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <div className="mt-3 grid gap-1">
                  <button type="button" className="px-btn" onClick={() => start()} autoFocus>
                    <RotateCcw className="size-4" /> Play again
                  </button>
                  {exit}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
