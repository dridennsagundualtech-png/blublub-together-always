import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Check, Minus, Plus, RotateCw, Trash2 } from "lucide-react";
import { Doodle, type Critter } from "@/components/Doodles";
import { ITEM_BY_KEY, plantStage, type RoomItemRow } from "@/lib/room";

import { cn } from "@/lib/utils";
import layerUp from "@/assets/layer-up.png.asset.json";
import layerDown from "@/assets/layer-down.png.asset.json";

type Pos = { x: number; y: number };

const MASCOTS: { critter: Critter; x: number; y: number; size: number }[] = [
  { critter: "penguin", x: 26, y: 62, size: 56 },
  { critter: "seal", x: 55, y: 84, size: 52 },
  { critter: "cat", x: 79, y: 55, size: 48 },
];

const SEED_HOME: Pos = { x: 12, y: 62 };

export function RoomStage({
  items,
  growth,
  editing,
  selectedId,
  backgroundUrl,
  seedUrl,
  seedLabel,
  petScales,
  petPositions,
  petZ,
  mascotVisibility,
  showSeed = true,
  fullscreen,
  roomNav,
  toolbar,
  onSelect,
  onMove,
  onMovePet,
  onRotate,
  onRemove,
  onScale,
  onLayer,
  onWater,
  onDoneEditing,
}: {
  items: RoomItemRow[];
  growth: number;
  editing: boolean;
  selectedId: string | null;
  backgroundUrl?: string | undefined;
  seedUrl?: string | undefined;
  seedLabel?: string | undefined;
  petScales?: Record<string, number> | undefined;
  petPositions?: Record<string, Pos> | undefined;
  petZ?: Record<string, number> | undefined;
  mascotVisibility?: Record<string, boolean> | undefined;
  fullscreen?: boolean | undefined;
  toolbar?: ReactNode | undefined;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onMovePet: (key: string, x: number, y: number) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  onScale: (id: string, scale: number) => void;
  onLayer: (id: string, z: number) => void;
  onWater: () => void;
  onDoneEditing?: (() => void) | undefined;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const stage = plantStage(growth);
  const petScale = (key: string) => Number(petScales?.[key] ?? 1);
  const petPos = (key: string, fallback: Pos) => petPositions?.[key] ?? fallback;
  const petLayer = (key: string) => Number(petZ?.[key] ?? 0);
  const isPet = !!selectedId?.startsWith("pet:");
  const currentScale = selectedId
    ? isPet
      ? petScale(selectedId.slice(4))
      : Number(items.find((i) => i.id === selectedId)?.scale ?? 1)
    : 1;
  const currentZ = selectedId
    ? isPet
      ? petLayer(selectedId.slice(4))
      : Number(items.find((i) => i.id === selectedId)?.z ?? 0)
    : 0;
  const nudgeLayer = (delta: number) => {
    if (!selectedId) return;
    onLayer(selectedId, Math.min(99, Math.max(-99, currentZ + delta)));
  };
  const step = (delta: number) => {
    if (!selectedId) return;
    const next = Math.min(3, Math.max(0.4, Math.round((currentScale + delta) * 100) / 100));
    onScale(selectedId, next);
  };

  function pointFromEvent(e: { clientX: number; clientY: number }) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(96, Math.max(4, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(96, Math.max(6, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }

  function startDrag(e: ReactPointerEvent, id: string) {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { id, moved: false };
    onSelect(id);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragRef.current) return;
    const p = pointFromEvent(e);
    if (p) {
      dragRef.current.moved = true;
      setDrag({ id: dragRef.current.id, ...p });
    }
  }

  function endDrag() {
    const current = dragRef.current;
    if (current && drag && drag.id === current.id && current.moved) {
      const x = Math.round(drag.x * 10) / 10;
      const y = Math.round(drag.y * 10) / 10;
      if (current.id.startsWith("pet:")) onMovePet(current.id.slice(4), x, y);
      else onMove(current.id, x, y);
    }
    dragRef.current = null;
    setDrag(null);
  }

  const seedLive = drag && drag.id === "pet:seed" ? drag : null;
  const seedPos = seedLive ?? petPos("seed", SEED_HOME);

  return (
    <div
      ref={stageRef}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={() => editing && onSelect(null)}
      data-no-page-swipe
      className={cn(
        "room-stage relative touch-none select-none overflow-hidden",
        fullscreen
          ? "fixed inset-0 z-[70] h-[100dvh] w-full bg-black"
          : "card-soft aspect-[4/5] w-full p-0",
      )}
      style={{ touchAction: "none" }}
    >
      {/* Room background */}
      {backgroundUrl ? (
        <img
          src={backgroundUrl}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 size-full select-none object-cover"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--lavender)_28%,white)_0%,color-mix(in_oklab,var(--peach)_30%,white)_100%)]" />
      )}

      {/* Seed only in the room where it lives */}
      {showSeed ? (
      <div
        className="absolute flex flex-col items-center"
        style={{
          left: `${seedPos.x}%`,
          top: `${seedPos.y}%`,
          transform: `translate(-50%, -100%) scale(${petScale("seed")})`,
          transformOrigin: "center bottom",
          zIndex: 20 + petLayer("seed"),
        }}
      >
        <button
          type="button"
          onPointerDown={(e) => startDrag(e, "pet:seed")}
          onClick={(e) => {
            e.stopPropagation();
            if (editing) {
              onSelect("pet:seed");
              return;
            }
            onWater();
          }}
          className={cn(
            "press grid size-[4.75rem] place-items-center overflow-hidden rounded-full p-1 leading-none",
            selectedId === "pet:seed"
              ? "bg-card/80 ring-2 ring-primary ring-offset-2 ring-offset-transparent"
              : "bg-transparent",
          )}
          aria-label="Shared seed companion"
        >
          {seedUrl ? (
            <img
              src={seedUrl}
              alt={seedLabel ?? stage.label}
              draggable={false}
              className="room-float pointer-events-none h-[85%] w-[85%] max-h-full max-w-full object-contain object-center select-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.12)]"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <span className="room-sway block text-4xl drop-shadow">🌱</span>
          )}
        </button>
        <span className="pointer-events-none mt-1 whitespace-nowrap rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-bold text-muted-foreground shadow-sm">
          {seedLabel ?? stage.label}
        </span>
      </div>
      ) : null}

      {/* Mascots */}
      {MASCOTS.filter((m) => mascotVisibility?.[m.critter] !== false).map((m, i) => {
        const live = drag && drag.id === `pet:${m.critter}` ? drag : null;
        const pos = live ?? petPos(m.critter, { x: m.x, y: m.y });
        return (
          <button
            key={m.critter}
            type="button"
            onPointerDown={(e) => startDrag(e, `pet:${m.critter}`)}
            onClick={(e) => {
              e.stopPropagation();
              if (editing) onSelect(`pet:${m.critter}`);
            }}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -100%) scale(${petScale(m.critter)})`,
              transformOrigin: "center bottom",
              animationDelay: `${i * 0.7}s`,
              zIndex: 20 + petLayer(m.critter),
            }}
            className={cn(
              "room-float absolute rounded-2xl p-0 leading-none",
              selectedId === `pet:${m.critter}` && "bg-card/70 ring-2 ring-primary",
            )}
            aria-label={m.critter}
          >
            <Doodle
              critter={m.critter}
              pose={m.critter === "seal" ? "sleep" : "love"}
              size={m.size}
            />
          </button>
        );
      })}

      {/* Placed items */}
      {items.map((it) => {
        const meta = ITEM_BY_KEY.get(it.item_key);
        if (!meta) return null;
        const live = drag && drag.id === it.id ? drag : null;
        const selected = selectedId === it.id;
        const art = meta.url;
        const px = meta.size * Number(it.scale) * 1.5;
        return (
          <button
            key={it.id}
            type="button"
            onPointerDown={(e) => startDrag(e, it.id)}
            onClick={(e) => {
              e.stopPropagation();
              if (editing) onSelect(it.id);
            }}
            style={{
              left: `${live ? live.x : Number(it.x)}%`,
              top: `${live ? live.y : Number(it.y)}%`,
              transform: `translate(-50%,-50%) rotate(${it.rotation}deg)`,
              zIndex: 20 + Number(it.z ?? 0),
            }}
            className={cn(
              "absolute grid place-items-center rounded-2xl p-1 leading-none transition-[box-shadow,background-color] duration-200",
              editing && "cursor-grab",
              selected && "bg-card/70 ring-2 ring-primary",
              live && "scale-105",
            )}
          >
            <img
              src={art}
              alt={meta.label}
              draggable={false}
              style={{ width: px }}
              className="pointer-events-none max-w-none select-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.12)]"
            />
          </button>
        );
      })}

      {/* Selected item controls */}
      {editing && selectedId ? (
        <div
          className={cn(
            "absolute inset-x-0 mx-auto flex w-fit max-w-[95%] flex-wrap items-center justify-center gap-2 rounded-full bg-card/95 px-3 py-2 shadow-float",
            fullscreen ? "bottom-[calc(env(safe-area-inset-bottom)+1rem)]" : "bottom-2",
          )}
          style={{ zIndex: 310 }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="px-1 text-xs font-bold text-muted-foreground">Drag to move</span>
          <button
            type="button"
            onClick={() => step(-0.1)}
            className="press grid size-9 place-items-center rounded-full bg-secondary"
            aria-label="Make smaller"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-10 text-center text-xs font-bold tabular-nums">
            {Math.round(currentScale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => step(0.1)}
            className="press grid size-9 place-items-center rounded-full bg-secondary"
            aria-label="Make bigger"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => nudgeLayer(-1)}
            className="press grid size-9 place-items-center rounded-full bg-secondary"
            aria-label="Send backward a layer"
          >
            <img src={layerDown.url} alt="" className="size-5" />
          </button>
          <span className="w-8 text-center text-xs font-bold tabular-nums">{currentZ}</span>
          <button
            type="button"
            onClick={() => nudgeLayer(1)}
            className="press grid size-9 place-items-center rounded-full bg-secondary"
            aria-label="Bring forward a layer"
          >
            <img src={layerUp.url} alt="" className="size-5" />
          </button>
          {!isPet ? (
            <>
              <button
                type="button"
                onClick={() => onRotate(selectedId)}
                className="press grid size-9 place-items-center rounded-full bg-secondary"
                aria-label="Rotate item"
              >
                <RotateCw className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(selectedId)}
                className="press grid size-9 place-items-center rounded-full bg-destructive/15 text-destructive"
                aria-label="Remove item"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Fullscreen toolbar — hidden while decorating so nothing covers the room */}

      {/* Room arrows — top bar, compact */}
      {fullscreen && roomNav ? (
        <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.4rem)] z-[80] flex items-center justify-between gap-2 px-2">
          <button
            type="button"
            aria-label="Previous room"
            disabled={!roomNav.canPrev}
            onClick={(e) => {
              e.stopPropagation();
              roomNav.onPrev();
            }}
            className="press shrink-0 rounded-lg bg-card/90 p-1 shadow-sm disabled:opacity-25"
          >
            {roomNav.arrowLeftSrc ? (
              <img
                src={roomNav.arrowLeftSrc}
                alt=""
                className="size-5 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <span className="px-1 text-sm font-black">‹</span>
            )}
          </button>
          <p className="pointer-events-none min-w-0 truncate rounded-full bg-card/90 px-2.5 py-0.5 text-center text-[10px] font-bold text-foreground shadow-sm">
            {roomNav.label}
          </p>
          <button
            type="button"
            aria-label="Next room"
            disabled={!roomNav.canNext}
            onClick={(e) => {
              e.stopPropagation();
              roomNav.onNext();
            }}
            className="press shrink-0 rounded-lg bg-card/90 p-1 shadow-sm disabled:opacity-25"
          >
            {roomNav.arrowRightSrc ? (
              <img
                src={roomNav.arrowRightSrc}
                alt=""
                className="size-5 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <span className="px-1 text-sm font-black">›</span>
            )}
          </button>
        </div>
      ) : null}

      {fullscreen && toolbar && !editing ? (
        <div
          className="absolute inset-x-0 bottom-0 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3"
          style={{ zIndex: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {toolbar}
        </div>
      ) : null}

      {/* Corner "done" tap target while decorating */}
      {editing && onDoneEditing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDoneEditing();
          }}
          style={{ zIndex: 320 }}
          className="press absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground shadow-float"
          aria-label="Finish decorating"
        >
          <Check className="size-4" /> Done
        </button>
      ) : null}
    </div>
  );
}
