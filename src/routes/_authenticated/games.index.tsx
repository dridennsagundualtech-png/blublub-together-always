import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Gamepad2, Lock, Pencil, Plus, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, EmptyState, PrimaryButton, SectionTitle, StatHero } from "@/components/ui-kit";
import { RoomStage } from "@/components/room/RoomStage";
import { useBadges } from "@/lib/badges";
import {
  CATEGORY_LABELS,
  ITEM_BY_KEY,
  ROOM_CATALOG,
  plantStage,
  useRoom,
  useRoomActions,
  useRoomItems,
  useRoomUnlocks,
  type RoomCategory,
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

const CATEGORIES: RoomCategory[] = ["furniture", "plants", "wall", "floor", "mascot", "special"];

function RoomPage() {
  const { data: badges } = useBadges();
  const { data: room, isLoading } = useRoom();
  const { data: items } = useRoomItems();
  const { data: unlocks } = useRoomUnlocks();
  const actions = useRoomActions();

  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [category, setCategory] = useState<RoomCategory>("furniture");
  const [note, setNote] = useState<string | null>(null);

  const unlocked = useMemo(() => new Set(unlocks ?? []), [unlocks]);
  const points = room?.love_points ?? 0;
  const stage = plantStage(room?.plant_growth ?? 0);
  const placed = items ?? [];

  function toast(text: string) {
    setNote(text);
    window.setTimeout(() => setNote((n) => (n === text ? null : n)), 2200);
  }

  return (
    <AppLayout title="Our Room" subtitle="A little world you build together" critter="seal" critterPose="love">
      <StatHero className="mb-3 flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Love Points
          </p>
          <p className="font-display text-3xl font-extrabold text-primary">{points}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Our plant
          </p>
          <p className="text-sm font-bold">
            <span className="mr-1 text-lg">{stage.glyph}</span>
            {stage.label}
          </p>
        </div>
      </StatHero>

      {isLoading ? (
        <Card>Loading your room…</Card>
      ) : (
        <RoomStage
          items={placed}
          growth={room?.plant_growth ?? 0}
          editing={editing}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={(id, x, y) => actions.move.mutate({ id, x, y })}
          onRotate={(id) => {
            const it = placed.find((p) => p.id === id);
            actions.transform.mutate({ id, rotation: (((it?.rotation ?? 0) + 15) % 360) });
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
      )}

      {note ? (
        <p className="mt-2 rounded-2xl bg-secondary px-4 py-2 text-center text-xs font-bold">
          {note}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            playChirp("tap");
            setEditing((v) => !v);
            setSelectedId(null);
          }}
          className={cn(
            "press card-soft flex items-center justify-center gap-2 p-3 text-sm font-bold",
            editing && "bg-primary text-primary-foreground",
          )}
        >
          {editing ? <Check className="size-4" /> : <Pencil className="size-4" />}
          {editing ? "Done editing" : "Edit room"}
        </button>
        <button
          type="button"
          onClick={() => {
            playChirp("tap");
            setSheetOpen(true);
          }}
          className="press card-soft flex items-center justify-center gap-2 p-3 text-sm font-bold"
        >
          <Plus className="size-4" /> Decorations
        </button>
      </div>

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
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>

            <ul className="grid grid-cols-3 gap-2">
              {ROOM_CATALOG.filter((i) => i.category === category).map((item) => {
                const owned = item.cost === 0 || unlocked.has(item.key);
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
                      <span className="text-2xl">{item.glyph}</span>
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

      {placed.length > 0 ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {placed.length} item{placed.length === 1 ? "" : "s"} placed ·{" "}
          {placed.filter((p) => ITEM_BY_KEY.get(p.item_key)?.wall).length} on the wall
        </p>
      ) : null}
    </AppLayout>
  );
}
