import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { toast } from "sonner";
import {
  BookHeart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Play,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { LookBack } from "@/components/LookBack";
import { Card, Field, PrimaryButton, ProgressBar, TextInput } from "@/components/ui-kit";
import { todayISO } from "@/lib/badges";
import { useCoupleId, useMembers } from "@/lib/session";
import { bookToPdf, canvasToJpeg, prepareBook, renderPage, type Book } from "@/lib/memory-book";
import { loadLookBack, type Slide } from "@/lib/lookback";
import type { VideoProgress } from "@/lib/lookback-video";

export const Route = createFileRoute("/_authenticated/memory-book")({
  head: () => ({
    meta: [
      { title: "Memory Book — BLUBLUB" },
      {
        name: "description",
        content:
          "Relive your memories as a Look Back story with music, save it as a video to share, or make a printable book.",
      },
      { property: "og:title", content: "Memory Book — BLUBLUB" },
      {
        property: "og:description",
        content:
          "Relive your memories as a Look Back story with music, save it as a video to share, or make a printable book.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MemoryBookPage,
});

function monthsAgoISO(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

type Progress = { done: number; total: number } | null;
type Range = "year" | "half" | "all" | "custom";
const RANGES: { id: Range; label: string }[] = [
  { id: "year", label: "This year" },
  { id: "half", label: "Last 6 months" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Pick dates" },
];

const sizeMB = (f: File) => `${(f.size / 1024 / 1024).toFixed(1)} MB`;
const minutes = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

const userAgent = () => (typeof navigator === "undefined" ? "" : navigator.userAgent);
const isIOS = () => /iPhone|iPad|iPod/.test(userAgent());
// Messenger, Instagram & co. open links in their own browser (an Android "wv"), which can't save files.
const inAppBrowser = () =>
  /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|; wv\)/.test(userAgent()) ||
  (typeof window !== "undefined" && window.self !== window.top);

/** Saves a file. Pass `url` to reuse a link that stays alive (the video's own). */
function download(file: File, url?: string) {
  const href = url ?? URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = href;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  // Android asks "Download file?" first, so the link must still work when you answer.
  if (!url) setTimeout(() => URL.revokeObjectURL(href), 5 * 60_000);
  toast("Downloading… you'll find it in your Downloads.");
}

// Sharing needs a fresh tap, so Share only shows once the file exists.
const canShare = (file: File | null | undefined) =>
  !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });
async function share(file: File, title: string) {
  try {
    await navigator.share({ files: [file], title });
  } catch (e) {
    if ((e as Error).name !== "AbortError") download(file);
  }
}

type Video = { file: File; url: string; music: boolean; seconds: number; from: string; to: string };

function MemoryBookPage() {
  const coupleId = useCoupleId();
  const { data: members } = useMembers();
  const [range, setRange] = useState<Range>("year");
  const [from, setFrom] = useState(`${todayISO().slice(0, 4)}-01-01`);
  const [to, setTo] = useState(todayISO());
  const [story, setStory] = useState<Slide[] | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const anniversary =
    members
      ?.map((m) => m.anniversary_date)
      .filter(Boolean)
      .sort()[0] ?? null;
  const names = (members ?? []).map((m) => m.display_name ?? "Partner");
  const nameOf = (id: string) => members?.find((m) => m.id === id)?.display_name ?? "Partner";

  function pickRange(r: Range) {
    setRange(r);
    if (r === "custom") return;
    setTo(todayISO());
    setFrom(
      r === "year"
        ? `${todayISO().slice(0, 4)}-01-01`
        : r === "half"
          ? monthsAgoISO(6)
          : (anniversary ?? "2000-01-01"),
    );
  }

  const play = useMutation({
    mutationFn: () =>
      loadLookBack({
        coupleId: coupleId!,
        from,
        to,
        today: todayISO(),
        names,
        anniversary,
        nameOf,
      }),
    onSuccess: (slides) => {
      // Only the cover and the goodbye: nothing to look back on in these dates.
      if (slides.length <= 2) toast("No memories in these dates yet — try All time.");
      else setStory(slides);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const makeVideo = useMutation({
    mutationFn: async (loaded: Slide[] | undefined) => {
      setTimeout(
        () => videoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50,
      );
      const slides =
        loaded ??
        (await loadLookBack({
          coupleId: coupleId!,
          from,
          to,
          today: todayISO(),
          names,
          anniversary,
          nameOf,
        }));
      if (slides.length <= 2) throw new Error("No memories in these dates yet — try All time.");
      // The video library only loads when someone saves a video.
      const { makeLookBackVideo } = await import("@/lib/lookback-video");
      const made = await makeLookBackVideo(
        slides,
        `blublub-look-back-${from}-to-${to}.mp4`,
        setVideoProgress,
      );
      setVideo({ ...made, url: URL.createObjectURL(made.file), from, to });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setVideoProgress(null),
  });
  // Let go of the old video's memory when a new one replaces it (or you leave).
  useEffect(
    () => () => {
      if (video) URL.revokeObjectURL(video.url);
    },
    [video],
  );
  const videoPct = !videoProgress
    ? 0
    : videoProgress.step === "photos"
      ? (videoProgress.done / Math.max(1, videoProgress.total)) * 15
      : 15 + (videoProgress.done / videoProgress.total) * 85;

  const [book, setBook] = useState<(Book & { from: string; to: string }) | null>(null);
  const [loading, setLoading] = useState<Progress>(null);
  const [saving, setSaving] = useState<Progress>(null);
  const [pdf, setPdf] = useState<File | null>(null);

  const make = useMutation({
    mutationFn: async () => {
      setPdf(null);
      const made = await prepareBook({
        coupleId: coupleId!,
        from,
        to,
        names,
        nameOf,
        onProgress: (done, total) => setLoading({ done, total }),
      });
      setBook({ ...made, from, to });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setLoading(null),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!book) throw new Error("Make the book first");
      const file = pdf ?? (await bookToPdf(book, (done, total) => setSaving({ done, total })));
      setPdf(file);
      return file;
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setSaving(null),
  });

  const stale = !!book && (book.from !== from || book.to !== to);

  return (
    <AppLayout
      title="Memory book"
      subtitle="Relive it, then keep it"
      critter="seal"
      critterPose="sleep"
    >
      <section className="relative overflow-hidden rounded-[1.5rem] bg-primary p-5 text-primary-foreground shadow-float">
        <p className="text-xs font-bold uppercase tracking-[0.15em] opacity-80">Look Back</p>
        <h2 className="font-display mt-1 text-2xl font-extrabold leading-tight">
          Relive your story
        </h2>
        <p className="mt-1 max-w-[30ch] text-sm opacity-90">
          Your best photos, diary moments and answers as a little movie, with music.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={play.isPending || !coupleId || !members}
            onClick={() => play.mutate()}
            className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#2b2233] shadow-soft disabled:opacity-70"
          >
            <Play className="size-4 fill-current" />
            {play.isPending ? "Gathering your memories…" : "Play our Look Back"}
          </button>
          <button
            type="button"
            disabled={makeVideo.isPending || !coupleId || !members}
            onClick={() => makeVideo.mutate(undefined)}
            className="press inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-current/40 px-5 text-sm font-bold disabled:opacity-70"
          >
            <Clapperboard className="size-4" />
            Save as a video
          </button>
        </div>
      </section>

      <Card className="mt-4">
        <p className="text-sm font-bold">Which memories?</p>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Dates">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={range === r.id}
              onClick={() => pickRange(r.id)}
              className={`press min-h-10 rounded-full px-4 text-xs font-bold ${range === r.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {range === "custom" ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="From">
              <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        ) : null}
      </Card>

      {makeVideo.isPending || video ? (
        <div ref={videoRef} className="mt-4 scroll-mt-24">
          <Card>
            {makeVideo.isPending ? (
              <>
                <p className="text-sm font-bold">Making your video… {Math.round(videoPct)}%</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {videoProgress?.step === "frames"
                    ? "Putting it together with the music. Keep this screen open."
                    : videoProgress
                      ? `Getting your photos ready (${videoProgress.done} of ${videoProgress.total})`
                      : "Gathering your memories…"}
                </p>
                <div className="mt-3">
                  <ProgressBar value={videoPct} />
                </div>
              </>
            ) : video ? (
              <>
                <video
                  src={video.url}
                  controls
                  playsInline
                  className="mx-auto block aspect-[9/16] max-h-[60vh] w-auto rounded-2xl bg-black"
                />
                <p className="mt-3 text-sm font-bold">Your video is ready</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {minutes(video.seconds)} · {sizeMB(video.file)}
                  {video.music ? "" : " · without music (this browser can't add it)"}
                  {video.from !== from || video.to !== to
                    ? " · these are the old dates — save it again to update"
                    : ""}
                </p>
                <div className={`mt-3 grid gap-2 ${canShare(video.file) ? "grid-cols-2" : ""}`}>
                  {canShare(video.file) ? (
                    <PrimaryButton onClick={() => void share(video.file, "Our Look Back")}>
                      Share
                    </PrimaryButton>
                  ) : null}
                  <PrimaryButton onClick={() => download(video.file, video.url)}>
                    Download
                  </PrimaryButton>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {inAppBrowser()
                    ? "BLUBLUB is open inside another app (like Messenger), which can't save videos. Open it in Chrome or Safari to save it: tap the ⋮ menu, then Open in browser."
                    : isIOS() && canShare(video.file)
                      ? "To keep it in your Photos, tap Share, then Save video."
                      : "Download saves it to your Downloads folder."}
                </p>
              </>
            ) : null}
          </Card>
        </div>
      ) : null}

      <details className="group mt-4">
        <summary className="surface-quiet press flex min-h-14 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <BookHeart className="size-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Make a printable book</span>
            <span className="block text-xs text-muted-foreground">
              The same memories as a PDF, to print or keep.
            </span>
          </span>
          <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <Card className="mt-4">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Flip through it here first — the PDF is exactly what you see.
            </p>
            <PrimaryButton disabled={make.isPending || !coupleId} onClick={() => make.mutate()}>
              {!make.isPending
                ? book
                  ? stale
                    ? "Make the book with these dates"
                    : "Make it again"
                  : "Make the book"
                : loading && loading.total > 0 && loading.done < loading.total
                  ? `Adding photo ${loading.done + 1} of ${loading.total}…`
                  : "Putting your book together…"}
            </PrimaryButton>
            {make.isPending && loading && loading.total > 0 ? (
              <ProgressBar value={(loading.done / loading.total) * 100} />
            ) : null}
          </div>
        </Card>

        {book && !make.isPending ? (
          <>
            <BookPreview book={book} />

            <Card className="mt-4">
              <p className="text-sm font-bold">Happy with it?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {book.pages.length} pages
                {pdf ? ` · ${(pdf.size / 1024 / 1024).toFixed(1)} MB PDF` : ""}
                {stale ? " · these are the old dates — make it again to update" : ""}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PrimaryButton
                  disabled={save.isPending}
                  onClick={() => save.mutate(undefined, { onSuccess: (file) => download(file) })}
                >
                  {save.isPending && saving
                    ? `Saving page ${Math.min(saving.done + 1, saving.total)} of ${saving.total}…`
                    : "Save PDF"}
                </PrimaryButton>
                {canShare(pdf) ? (
                  <PrimaryButton
                    disabled={save.isPending}
                    onClick={() => pdf && void share(pdf, "Our memory book")}
                  >
                    Share
                  </PrimaryButton>
                ) : null}
              </div>
              {save.isPending && saving ? (
                <div className="mt-3">
                  <ProgressBar value={(saving.done / saving.total) * 100} />
                </div>
              ) : null}
            </Card>
          </>
        ) : null}
      </details>

      {story ? (
        <LookBack
          slides={story}
          onClose={() => setStory(null)}
          onVideo={() => {
            setStory(null);
            if (!makeVideo.isPending) makeVideo.mutate(story);
          }}
        />
      ) : null}
    </AppLayout>
  );
}

/** Swipe through the book. Only the pages near the one you're on are drawn, so big books stay light. */
function BookPreview({ book }: { book: Book }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false });
  const [index, setIndex] = useState(0);
  const total = book.pages.length;

  const onSelect = useCallback(() => {
    if (embla) setIndex(embla.selectedScrollSnap());
  }, [embla]);
  useEffect(() => {
    if (!embla) return;
    embla.on("select", onSelect);
    embla.on("reInit", onSelect);
    return () => {
      embla.off("select", onSelect);
      embla.off("reInit", onSelect);
    };
  }, [embla, onSelect]);

  return (
    <section className="mt-4" aria-label="Book preview">
      <div
        className="overflow-hidden rounded-2xl bg-muted shadow-soft"
        ref={emblaRef}
        data-no-page-swipe
      >
        <div className="flex touch-pan-y">
          {book.pages.map((_, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%] p-3">
              <PageImage book={book} index={i} near={Math.abs(i - index) <= 1} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          aria-label="Previous page"
          disabled={index === 0}
          onClick={() => embla?.scrollPrev()}
          className="press grid size-11 shrink-0 place-items-center rounded-full bg-card shadow-soft disabled:opacity-40"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={1}
            max={total}
            value={index + 1}
            aria-label="Jump to page"
            onChange={(e) => embla?.scrollTo(Number(e.target.value) - 1, true)}
            className="w-full accent-primary"
          />
          <p className="text-center text-xs font-bold text-muted-foreground">
            {index === 0 ? "Cover" : `Page ${index + 1}`} of {total}
          </p>
        </div>
        <button
          type="button"
          aria-label="Next page"
          disabled={index >= total - 1}
          onClick={() => embla?.scrollNext()}
          className="press grid size-11 shrink-0 place-items-center rounded-full bg-card shadow-soft disabled:opacity-40"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  );
}

/** One page as a picture, drawn when you're near it and let go when you're far away. */
function PageImage({ book, index, near }: { book: Book; index: number; near: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    void renderPage(book, index, 1.5).then((canvas) => {
      const blob = canvasToJpeg(canvas, 0.85);
      canvas.width = canvas.height = 0;
      if (cancelled) return;
      urlRef.current = URL.createObjectURL(blob);
      setSrc(urlRef.current);
    });
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setSrc(null);
    };
  }, [book, index, near]);

  return (
    <div className="relative mx-auto aspect-[595/842] w-full overflow-hidden rounded-md bg-white shadow-float">
      {src ? (
        <img
          src={src}
          alt={index === 0 ? "Book cover" : `Page ${index + 1}`}
          className="size-full"
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-muted/60" />
      )}
    </div>
  );
}
