import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Gamepad2, Image as ImageIcon, Lock, Maximize2, Minimize2, Pencil, Plus, Sparkles, Sprout } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, EmptyState, PrimaryButton, SectionTitle, StatHero } from "@/components/ui-kit";
import { RoomStage } from "@/components/room/RoomStage";
import { useBadges } from "@/lib/badges";
import { useIsAdmin } from "@/lib/admin";
import {
  ROOM_CATALOG,
  ROOM_THEMES,
  ROOM_BACKGROUNDS,
  BG_BY_KEY,
  DEFAULT_BACKGROUND_KEY,
  SEED_COLORS,
  SEED_CHARACTERS,
  THEME_LABELS,
  seedArt,
  seedStep,
  seedThumb,
  useRoom,
  useRoomActions,
  useRoomItems,
  useRoomUnlocks,
  type RoomTheme,
  type BgCategory,
} from "@/lib/room";

import { playChirp } from "@/hooks/use-sound";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/games/")({
  head: () => ({
    meta: [
      { title: "Our Room — BLUBLUB" },
      {
        name: "description",
        content: "A cosy shared room the two of you decorate together — plus the game corner.",
      },
      { property: "og:title", content: "Our Room — BLUBLUB" },
      {
        property: "og:description",
        content: "A cosy shared room the two of you decorate together — plus the game corner.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoomPage,
});

const CATEGORIES = ROOM_THEMES;

function RoomPage() {
  const { data: badges } = useBadges();
  const { data: room, isLoading } = useRoom();
  const { data: items } = useRoomItems();
  const { data: unlocks } = useRoomUnlocks();
  const actions = useRoomActions();
  const { data: isAdmin } = useIsAdmin();

  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [bgCategory, setBgCategory] = useState<BgCategory>("indoor");
  const [category, setCategory] = useState<RoomTheme>(ROOM_THEMES[0]!);
  const [note, setNote] = useState<string | null>(null);

  const unlocked = useMemo(() => new Set(unlocks ?? []), [unlocks]);
  const points = room?.love_points ?? 0;
  const growth = room?.plant_growth ?? 0;
  const stage = seedStep(growth);
  const placed = items ?? [];
  const hour = new Date().getHours();
  const sleeping = hour >= 22 || hour < 6;
  const seedColor = room?.seed_color ?? "pink";
  const seedCharacter = room?.seed_character ?? null;
  const seedUrl = seedArt(growth, seedColor, seedCharacter, sleeping);
  const bgUrl = BG_BY_KEY.get(room?.background_key ?? DEFAULT_BACKGROUND_KEY)?.url;

  function toast(text: string) {
    setNote(text);
    window.setTimeout(() => setNote((n) => (n === text ? null : n)), 2200);
  }

  const controls = (
    <div className="grid grid-cols-5 gap-1.5">
      <button
        type="button"
        onClick={() => {
          playChirp("tap");
          setEditing((v) => !v);
          setSelectedId(null);
        }}
        className={cn(
          "press card-soft flex flex-col items-center justify-center gap-1 p-2 text-[10px] font-bold",
          editing && "bg-primary text-primary-foreground",
        )}
      >
        {editing ? <Check className="size-4" /> : <Pencil className="size-4" />}
        {editing ? "Done" : "Edit"}
      </button>
      <button
        type="button"
        onClick={() => {
          playChirp("tap");
          setSheetOpen(true);
        }}
        className="press card-soft flex flex-col items-center justify-center gap-1 p-2 text-[10px] font-bold"
      >
        <Plus className="size-4" /> Decor
      </button>
      <button
        type="button"
        onClick={() => {
          playChirp("tap");
          setBgOpen(true);
        }}
        className="press card-soft flex flex-col items-center justify-center gap-1 p-2 text-[10px] font-bold"
      >
        <ImageIcon className="size-4" /> Rooms
      </button>
      <button
        type="button"
        onClick={() => {
          playChirp("tap");
          setSeedOpen(true);
        }}
        className="press card-soft flex flex-col items-center justify-center gap-1 p-2 text-[10px] font-bold"
      >
        <Sprout className="size-4" /> Seed
      </button>
      <button
        type="button"
        onClick={() => {
          playChirp("tap");
          setFullscreen((v) => !v);
          setSelectedId(null);
        }}
        className="press card-soft flex flex-col items-center justify-center gap-1 p-2 text-[10px] font-bold"
      >
        {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        {fullscreen ? "Exit" : "Full"}
      </button>
    </div>
  );

  const stageEl = (
    <RoomStage
      items={placed}
      growth={growth}
      editing={editing}
      selectedId={selectedId}
      backgroundUrl={bgUrl}
      seedUrl={seedUrl}
      seedLabel={stage.label}
      petScales={(room?.pet_scales ?? {}) as Record<string, number>}
      petPositions={(room?.pet_positions ?? {}) as Record<string, { x: number; y: number }>}
      fullscreen={fullscreen}
      toolbar={
        <div className="space-y-2">
          {note ? (
            <p className="rounded-2xl bg-card/95 px-4 py-2 text-center text-xs font-bold shadow-float">
              {note}
            </p>
          ) : null}
          {controls}
        </div>
      }
      onSelect={setSelectedId}
      onMove={(id, x, y) => actions.move.mutate({ id, x, y })}
      onMovePet={(key, x, y) => actions.setPetPosition.mutate({ key, x, y })}
      onRotate={(id) => {
        const it = placed.find((p) => p.id === id);
        actions.transform.mutate({ id, rotation: (((it?.rotation ?? 0) + 15) % 360) });
      }}
      onScale={(id, scale) => {
        if (id.startsWith("pet:")) {
          actions.setPetScale.mutate({ key: id.slice(4), scale });
          return;
        }
        actions.transform.mutate({ id, scale });
      }}
      onRemove={(id) => {
        actions.remove.mutate(id);
        setSelectedId(null);
      }}
      onWater={() => {
        if (actions.wateredToday) {
          toast("Already watered today 💧 come back tomorrow");
          return;
        }
        playChirp("tap");
        actions.water.mutate(undefined, {
          onSuccess: () => toast("+15 Love Points · the plant grew a little 🌿"),
        });
      }}
    />
  );

  const seedPanel = (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {seedUrl ? (
          <img
            src={seedUrl}
            alt={stage.label}
            className="h-16 w-auto"
            style={{ imageRendering: "pixelated" }}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            Step {stage.step} of 6 · {stage.label}
          </p>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, growth)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Water it once a day to help it evolve.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Colour
        </p>
        <div className="flex gap-2">
          {SEED_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                playChirp("tap");
                actions.setSeedVariant.mutate(
                  { color: c, character: null },
                  { onSuccess: () => toast(`Our seed is now ${c} 💗`) },
                );
              }}
              className={cn(
                "press rounded-full border border-border px-3 py-1.5 text-xs font-bold capitalize",
                seedColor === c ? "bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Who they grow into
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(SEED_CHARACTERS[seedColor as keyof typeof SEED_CHARACTERS] ?? []).map((ch) => (
            <button
              key={ch.key}
              type="button"
              onClick={() => {
                playChirp("tap");
                actions.setSeedVariant.mutate(
                  { character: ch.key },
                  { onSuccess: () => toast(`${ch.label} it is! 🌷`) },
                );
              }}
              className={cn(
                "press card-soft flex flex-col items-center gap-1 p-2",
                (seedCharacter ?? "") === ch.key && "ring-2 ring-primary",
              )}
            >
              <img
                src={seedThumb(seedColor, ch.key)}
                alt={ch.label}
                loading="lazy"
                className="h-10 w-auto"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="text-[11px] font-bold">{ch.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Your seed only shows its grown-up form from step 5 — but you can pick who they'll become
          any time.
        </p>
      </div>
    </div>
  );

  return (
    <AppLayout title="Our Room" subtitle="A little world you build together" critter="seal" critterPose="love">
      <StatHero className="mb-3 flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Love Points
          </p>
          <p className="font-display text-3xl font-extrabold text-primary">{points}</p>
        </div>
        <div className="flex items-center gap-2 text-right">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Our seed
            </p>
            <p className="text-sm font-bold">
              Step {stage.step} · {stage.label}
            </p>
          </div>
          {seedUrl ? (
            <img
              src={seedUrl}
              alt={stage.label}
              className="h-10 w-auto"
              style={{ imageRendering: "pixelated" }}
            />
          ) : null}
        </div>
      </StatHero>

      {isLoading ? <Card>Loading your room…</Card> : stageEl}

      {note && !fullscreen ? (
        <p className="mt-2 rounded-2xl bg-secondary px-4 py-2 text-center text-xs font-bold">
          {note}
        </p>
      ) : null}

      <div className="mt-3">{!fullscreen ? controls : null}</div>


      {/* Seed companion */}
      <SectionTitle>Our seed</SectionTitle>
      <Card className="space-y-3">
        <div className="flex items-center gap-3">
          {seedUrl ? (
            <img
              src={seedUrl}
              alt={stage.label}
              className="h-16 w-auto"
              style={{ imageRendering: "pixelated" }}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              Step {stage.step} of 6 · {stage.label}
            </p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, growth)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Water it once a day to help it evolve.
            </p>
          </div>
        </div>

        {stage.step >= 4 ? (
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Colour
            </p>
            <div className="flex gap-2">
              {SEED_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    playChirp("tap");
                    actions.setSeedVariant.mutate(
                      { color: c, character: null },
                      { onSuccess: () => toast(`Our seed is now ${c} 💗`) },
                    );
                  }}
                  className={cn(
                    "press rounded-full border border-border px-3 py-1.5 text-xs font-bold capitalize",
                    seedColor === c ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {stage.step >= 5 ? (
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Who they grow into
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(SEED_CHARACTERS[seedColor as keyof typeof SEED_CHARACTERS] ?? []).map((ch) => (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => {
                    playChirp("tap");
                    actions.setSeedVariant.mutate(
                      { character: ch.key },
                      { onSuccess: () => toast(`${ch.label} it is! 🌷`) },
                    );
                  }}
                  className={cn(
                    "press card-soft flex flex-col items-center gap-1 p-2",
                    (seedCharacter ?? "") === ch.key && "ring-2 ring-primary",
                  )}
                >
                  <img
                    src={seedThumb(seedColor, ch.key)}
                    alt={ch.label}
                    loading="lazy"
                    className="h-10 w-auto"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <span className="text-[11px] font-bold">{ch.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Card>


      <SectionTitle>More to do</SectionTitle>
      <ul className="space-y-2">
        <li>
          <Link to="/games/arcade" className="press card-soft flex items-center gap-3 p-4">
            <span className="relative grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
              <Gamepad2 className="size-5" />
              {badges?.games ? (
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card" />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Game corner</span>
              <span className="block truncate text-xs text-muted-foreground">
                Five two-player games, food roulette, 18+ dice
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
      </ul>

      {placed.length === 0 ? (
        <div className="mt-3">
          <EmptyState text="Your room is bare — open Decorations to place your first free item." />
        </div>
      ) : null}

      {/* Inventory bottom sheet */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-label="Decorations">
          <button
            type="button"
            aria-label="Close decorations"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
          />
          <div className="card-soft relative max-h-[76vh] w-full overflow-y-auto rounded-b-none p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-display text-lg font-extrabold">Decorations</p>
              <span className="streak-chip">
                <Sparkles className="size-3" /> {points} pts
              </span>
            </div>

            <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "press shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-bold",
                    category === c ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {THEME_LABELS[c]}
                </button>
              ))}
            </div>

            <ul className="grid grid-cols-3 gap-2">
              {ROOM_CATALOG.filter((i) => i.theme === category).map((item) => {
                const owned = isAdmin || item.cost === 0 || unlocked.has(item.key);
                const affordable = points >= item.cost;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => {
                        playChirp("tap");
                        if (owned) {
                          actions.place.mutate(
                            { itemKey: item.key },
                            {
                              onSuccess: () => {
                                setSheetOpen(false);
                                setEditing(true);
                                toast(`${item.label} placed — drag it where you like`);
                              },
                            },
                          );
                          return;
                        }
                        if (!affordable) {
                          toast(`${item.label} needs ${item.cost} Love Points`);
                          return;
                        }
                        actions.unlock.mutate(item.key, {
                          onSuccess: () => toast(`Unlocked ${item.label}! 💗`),
                        });
                      }}
                      className={cn(
                        "press card-soft flex h-full w-full flex-col items-center gap-1 p-3 text-center",
                        !owned && !affordable && "opacity-60",
                      )}
                    >
                      <img
                        src={item.url}
                        alt={item.label}
                        loading="lazy"
                        className="h-12 w-auto max-w-full object-contain"
                      />

                      <span className="text-[11px] font-bold leading-tight">{item.label}</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                        {owned ? (
                          "Tap to place"
                        ) : (
                          <>
                            <Lock className="size-3" /> {item.cost}
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4">
              <PrimaryButton onClick={() => setSheetOpen(false)}>Close</PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}

      {/* Background picker sheet */}
      {bgOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-label="Room backgrounds">
          <button
            type="button"
            aria-label="Close backgrounds"
            onClick={() => setBgOpen(false)}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
          />
          <div className="card-soft relative max-h-[76vh] w-full overflow-y-auto rounded-b-none p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-display text-lg font-extrabold">Rooms & scenery</p>
              <span className="streak-chip">
                <Sparkles className="size-3" /> {points} pts
              </span>
            </div>

            <div className="mb-3 flex gap-2">
              {(["indoor", "outdoor"] as BgCategory[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBgCategory(c)}
                  className={cn(
                    "press rounded-full border border-border px-3 py-1.5 text-xs font-bold capitalize",
                    bgCategory === c ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {c === "indoor" ? "Indoor" : "Outdoor"}
                </button>
              ))}
            </div>

            <ul className="grid grid-cols-2 gap-2">
              {ROOM_BACKGROUNDS.filter((b) => b.category === bgCategory).map((bg) => {
                const owned = isAdmin || bg.cost === 0 || unlocked.has(bg.key);
                const active = (room?.background_key ?? DEFAULT_BACKGROUND_KEY) === bg.key;
                return (
                  <li key={bg.key}>
                    <button
                      type="button"
                      onClick={() => {
                        playChirp("tap");
                        if (!owned && points < bg.cost && !isAdmin) {
                          toast(`${bg.label} needs ${bg.cost} Love Points`);
                          return;
                        }
                        actions.setBackground.mutate(bg.key, {
                          onSuccess: () => {
                            setBgOpen(false);
                            toast(`Moved into ${bg.label} ✨`);
                          },
                          onError: (e) => toast((e as Error).message),
                        });
                      }}
                      className={cn(
                        "press card-soft w-full overflow-hidden p-0 text-left",
                        active && "ring-2 ring-primary",
                        !owned && points < bg.cost && "opacity-60",
                      )}
                    >
                      <img
                        src={bg.url}
                        alt={bg.label}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                        style={{ imageRendering: "pixelated" }}
                      />
                      <span className="flex items-center justify-between gap-1 px-2 py-1.5">
                        <span className="truncate text-[11px] font-bold">{bg.label}</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                          {owned ? (active ? "Active" : "Free") : (
                            <>
                              <Lock className="size-3" /> {bg.cost}
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4">
              <PrimaryButton onClick={() => setBgOpen(false)}>Close</PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}



      {placed.length > 0 ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {placed.length} item{placed.length === 1 ? "" : "s"} placed
        </p>
      ) : null}
    </AppLayout>
  );
}
