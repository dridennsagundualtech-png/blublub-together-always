import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clapperboard, Pause, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import {
  drawFrame,
  loadPicture,
  pictureOf,
  prepareLook,
  slideText,
  type Look,
  type Pictures,
} from "@/lib/lookback-draw";
import { startLookBackMusic } from "@/lib/lookback-music";
import { SLIDE_MS, type Slide } from "@/lib/lookback";

const SOUND_KEY = "blublub:sound-enabled";
const HOLD_MS = 220;
const PICTURE_WAIT_MS = 10_000;

/** Full-screen story of your memories: tap right/left to skip, hold to pause.
 *  It shows the same frames the saved video is made of (lookback-draw.ts). */
export function LookBack({
  slides,
  onClose,
  onVideo,
}: {
  slides: Slide[];
  onClose: () => void;
  /** Saves the same story as a video. */
  onVideo: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [muted, setMuted] = useState(() => {
    try {
      return window.localStorage.getItem(SOUND_KEY) === "false";
    } catch {
      return false;
    }
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hold = useRef<{ timer: number; held: boolean } | null>(null);
  // The clock lives outside React so the 60 fps loop never re-renders the page.
  const clock = useRef({ index: 0, t: 0, ended: false });
  const live = useRef({ held, paused });
  live.current = { held, paused };
  const look = useRef<Look | null>(null);
  const pics = useRef<Pictures>(new Map());
  const settled = useRef(new Set<string>()); // pictures that loaded (or gave up)
  const loading = useRef(new Set<string>());
  const slide = slides[index]!;

  const go = useCallback(
    (to: number) => {
      const i = Math.max(0, Math.min(slides.length - 1, to));
      clock.current = { index: i, t: 0, ended: false };
      setIndex(i);
      setEnded(false);
    },
    [slides.length],
  );

  // App style + fonts once; this slide's picture and the next two as you go.
  useEffect(() => {
    void prepareLook().then((l) => (look.current = l));
  }, []);
  useEffect(() => {
    for (const s of slides.slice(index, index + 3)) {
      const url = pictureOf(s);
      if (!url || loading.current.has(url)) continue;
      loading.current.add(url);
      const done = () => settled.current.add(url);
      const giveUp = window.setTimeout(done, PICTURE_WAIT_MS);
      void loadPicture(url)
        .then((pic) => pics.current.set(url, pic))
        .catch(() => {})
        .finally(() => {
          window.clearTimeout(giveUp);
          done();
        });
    }
  }, [index, slides]);

  // The clock: moves while nothing is held/paused and the slide's picture is ready, then draws.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    let wasWaiting = true;
    let drawn = "";
    const frame = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      const c = clock.current;
      const s = slides[c.index]!;
      const dur = SLIDE_MS[s.kind];
      const url = pictureOf(s);
      const ok = !!look.current && (!url || settled.current.has(url));
      if (wasWaiting === ok) {
        wasWaiting = !ok;
        setWaiting(!ok);
      }
      if (ok && !live.current.held && !live.current.paused) c.t += dt;
      if (c.t >= dur && c.index < slides.length - 1) go(c.index + 1);
      else if (c.t >= dur && !c.ended) {
        c.ended = true;
        setEnded(true);
      }
      const now2 = clock.current;
      const key = `${now2.index}|${now2.t}|${canvas.width}`;
      if (ok && key !== drawn) {
        drawFrame(ctx, look.current!, pics.current, slides, now2.index, now2.t, motion);
        drawn = key;
      }
      if (barRef.current)
        barRef.current.style.transform = `scaleX(${Math.min(1, now2.t / SLIDE_MS[slides[now2.index]!.kind])})`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [slides, go]);

  // Sharp on any screen: the canvas matches its size on screen (at most 1080 px wide).
  useEffect(() => {
    const canvas = canvasRef.current!;
    const fit = () => {
      const w = Math.min(1080, Math.round(canvas.clientWidth * window.devicePixelRatio));
      if (w && canvas.width !== w) {
        canvas.width = w;
        canvas.height = Math.round((w * 16) / 9);
      }
    };
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    fit();
    return () => ro.disconnect();
  }, []);

  // Music follows the sound setting and stops when the story ends.
  useEffect(() => {
    if (muted || ended) return;
    try {
      return startLookBackMusic();
    } catch {
      return; // no audio here — the story still plays
    }
  }, [muted, ended]);

  // Keep the page behind still, and give focus back when closing.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(clock.current.index + 1);
      else if (e.key === "ArrowLeft") go(clock.current.index - 1);
      else if (e.key === " " && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const h = { timer: 0, held: false };
    h.timer = window.setTimeout(() => {
      h.held = true;
      setHeld(true);
    }, HOLD_MS);
    hold.current = h;
  }
  function onPointerUp(e: React.PointerEvent) {
    const h = hold.current;
    hold.current = null;
    if (!h) return;
    window.clearTimeout(h.timer);
    setHeld(false);
    if (h.held) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const i = clock.current.index;
    if (e.clientX - rect.left < rect.width * 0.3) go(i - 1);
    else if (i < slides.length - 1) go(i + 1);
  }
  function onPointerCancel() {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = null;
    setHeld(false);
  }

  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Our Look Back"
      data-no-page-swipe
      className="fixed inset-0 z-[90] flex justify-center bg-black text-white"
    >
      <div
        className="relative flex h-full select-none items-center"
        style={{ width: "min(100vw, calc(100dvh * 9 / 16))" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} className="block aspect-[9/16] w-full" aria-hidden="true" />
        <p className="sr-only" aria-live="polite">
          {slideText(slide)}
        </p>
        {waiting ? (
          <div
            className="pointer-events-none absolute inset-0 grid place-items-center"
            aria-label="Loading"
          >
            <span className="size-9 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
          </div>
        ) : null}

        {/* Top bar: progress, close and sound. Fades while you hold. */}
        <div
          className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/55 to-transparent px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))] transition-opacity duration-200"
          style={{ opacity: held ? 0 : 1 }}
        >
          <div className="flex gap-1" aria-hidden="true">
            {slides.map((_, i) => (
              <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                {i < index ? (
                  <div className="size-full bg-white" />
                ) : i === index ? (
                  <div ref={barRef} className="size-full origin-left scale-x-0 bg-white" />
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs font-bold text-white/80">
              Look Back
              <span className="sr-only">
                {" "}
                — part {index + 1} of {slides.length}
              </span>
            </p>
            <div className="flex items-center gap-1">
              {paused ? (
                <span className="mr-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
                  <Pause className="size-3" /> Paused
                </span>
              ) : null}
              <button
                type="button"
                aria-label={muted ? "Turn music on" : "Turn music off"}
                onPointerDown={stop}
                onPointerUp={stop}
                onClick={() => setMuted((m) => !m)}
                className="grid size-10 place-items-center rounded-full hover:bg-white/15"
              >
                {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close Look Back"
                onPointerDown={stop}
                onPointerUp={stop}
                onClick={onClose}
                className="grid size-10 place-items-center rounded-full hover:bg-white/15"
              >
                <X className="size-6" />
              </button>
            </div>
          </div>
        </div>

        {slide.kind === "outro" ? (
          <div
            className="absolute inset-x-0 bottom-0 z-10 space-y-2 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onPointerDown={stop}
            onPointerUp={stop}
          >
            <button
              type="button"
              onClick={onVideo}
              className="press flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground"
            >
              <Clapperboard className="size-4" /> Save it as a video
            </button>
            <button
              type="button"
              onClick={() => go(0)}
              className="press flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white/15 text-sm font-bold text-white"
            >
              <RotateCcw className="size-4" /> Watch again
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
