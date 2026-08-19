import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RotateCw, Trash2 } from "lucide-react";
import { Doodle, type Critter } from "@/components/Doodles";
import { ITEM_BY_KEY, plantStage, type RoomItemRow } from "@/lib/room";
import { cn } from "@/lib/utils";

type Bubble = { id: number; x: number; y: number; text: string };

const MASCOTS: { critter: Critter; x: number; y: number; line: string; size: number }[] = [
  { critter: "penguin", x: 26, y: 62, line: "🐧 Penguin is happy you're here!", size: 56 },
  { critter: "seal", x: 55, y: 84, line: "🦭 The seal is taking a cozy nap.", size: 52 },
  { critter: "cat", x: 79, y: 55, line: "🐱 Mrrp! The cat wants attention.", size: 48 },
];

export function RoomStage({
  items,
  growth,
  editing,
  selectedId,
  onSelect,
  onMove,
  onRotate,
  onRemove,
  onWater,
}: {
  items: RoomItemRow[];
  growth: number;
  editing: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  onWater: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string } | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const stage = plantStage(growth);

  function say(x: number, y: number, text: string) {
    const id = Date.now() + Math.random();
    setBubbles((b) => [...b, { id, x, y, text }]);
    window.setTimeout(() => setBubbles((b) => b.filter((n) => n.id !== id)), 2200);
  }

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
    dragRef.current = { id };
    onSelect(id);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragRef.current) return;
    const p = pointFromEvent(e);
    if (p) setDrag({ id: dragRef.current.id, ...p });
  }

  function endDrag() {
    if (dragRef.current && drag && drag.id === dragRef.current.id) {
      onMove(drag.id, Math.round(drag.x * 10) / 10, Math.round(drag.y * 10) / 10);
    }
    dragRef.current = null;
    setDrag(null);
  }

  return (
    <div
      ref={stageRef}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={() => editing && onSelect(null)}
      className="card-soft relative aspect-[4/5] w-full touch-none select-none overflow-hidden p-0"
      style={{ touchAction: "none" }}
    >
      {/* Back wall */}
      <div className="tile-lilac absolute inset-x-0 top-0 h-[62%]">
        <div className="absolute inset-0 opacity-60 [background:repeating-linear-gradient(90deg,transparent_0_28px,color-mix(in_oklab,var(--lavender)_18%,transparent)_28px_30px)]" />
        {/* Window */}
        <div className="tile-sky absolute left-[8%] top-[14%] h-[34%] w-[26%] rounded-2xl border border-border shadow-soft">
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
          <span className="absolute right-2 top-2 text-lg">☀️</span>
        </div>
        {/* Shelf */}
        <div className="absolute right-[10%] top-[20%] w-[30%]">
          <div className="flex items-end justify-center gap-1 pb-1 text-lg">
            <span>📗</span>
            <span>🕯️</span>
            <span>🐚</span>
          </div>
          <div className="tile-cream h-2 w-full rounded-full border border-border" />
        </div>
      </div>

      {/* Floor */}
      <div className="tile-peach absolute inset-x-0 bottom-0 h-[38%]">
        <div className="absolute inset-0 opacity-50 [background:repeating-linear-gradient(115deg,transparent_0_34px,color-mix(in_oklab,var(--honey)_22%,transparent)_34px_36px)]" />
      </div>

      {/* Built-in cosy furniture */}
      <div className="pointer-events-none absolute left-[8%] top-[44%] w-[30%]">
        <div className="tile-pink h-10 rounded-2xl border border-border shadow-soft" />
        <div className="tile-cream -mt-2 mx-2 h-6 rounded-xl border border-border" />
      </div>
      <div className="pointer-events-none absolute right-[6%] top-[40%] w-[32%]">
        <div className="tile-cream h-14 rounded-3xl border border-border shadow-soft" />
        <div className="tile-pink -mt-3 mx-3 h-5 rounded-full border border-border" />
      </div>
      <div className="pointer-events-none absolute left-[44%] top-[66%] w-[16%]">
        <div className="tile-cream h-3 rounded-full border border-border shadow-soft" />
        <div className="mx-auto h-6 w-1.5 rounded-full bg-border" />
      </div>

      {/* Shared plant */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onWater();
          say(12, 62, `${stage.glyph} Our little plant is growing!`);
        }}
        className="press absolute left-[10%] top-[64%] grid -translate-x-1/2 place-items-center"
        aria-label="Shared plant"
      >
        <span className="room-sway block text-4xl drop-shadow">{stage.glyph}</span>
        <span className="mt-0.5 rounded-full bg-card/85 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {stage.label}
        </span>
      </button>

      {/* Mascots */}
      {MASCOTS.map((m, i) => (
        <button
          key={m.critter}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            say(m.x, m.y, m.line);
          }}
          style={{ left: `${m.x}%`, top: `${m.y}%`, animationDelay: `${i * 0.7}s` }}
          className="room-float absolute -translate-x-1/2 -translate-y-1/2"
          aria-label={m.critter}
        >
          <Doodle critter={m.critter} pose={m.critter === "seal" ? "sleep" : "love"} size={m.size} />
        </button>
      ))}

      {/* Placed items */}
      {items.map((it) => {
        const meta = ITEM_BY_KEY.get(it.item_key);
        if (!meta) return null;
        const live = drag && drag.id === it.id ? drag : null;
        const selected = selectedId === it.id;
        const art = artFor(it.item_key);
        const px = meta.size * Number(it.scale) * 1.5;
        return (
          <button
            key={it.id}
            type="button"
            onPointerDown={(e) => startDrag(e, it.id)}
            onClick={(e) => {
              e.stopPropagation();
              if (editing) onSelect(it.id);
              else say(Number(it.x), Number(it.y), `${meta.glyph} ${meta.label}`);
            }}
            style={{
              left: `${live ? live.x : Number(it.x)}%`,
              top: `${live ? live.y : Number(it.y)}%`,
              fontSize: art ? undefined : meta.size * Number(it.scale) * 0.6,
              transform: `translate(-50%,-50%) rotate(${it.rotation}deg)`,
            }}
            className={cn(
              "absolute grid place-items-center rounded-2xl p-1 leading-none transition-[box-shadow,background-color] duration-200",
              editing && "cursor-grab",
              selected && "bg-card/70 ring-2 ring-primary",
              live && "scale-105",
            )}
          >
            {art ? (
              <img
                src={art}
                alt={meta.label}
                draggable={false}
                style={{ width: px }}
                className="pointer-events-none max-w-none select-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.12)]"
              />
            ) : (
              <span className="drop-shadow">{meta.glyph}</span>
            )}
          </button>
        );
      })}


      {/* Selected item controls */}
      {editing && selectedId ? (
        <div
          className="absolute inset-x-0 bottom-2 mx-auto flex w-fit items-center gap-2 rounded-full bg-card/95 px-3 py-2 shadow-float"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="px-1 text-xs font-bold text-muted-foreground">Drag to move</span>
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
        </div>
      ) : null}

      {/* Speech bubbles */}
      {bubbles.map((b) => (
        <span
          key={b.id}
          style={{ left: `${b.x}%`, top: `${b.y - 12}%` }}
          className="room-pop pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-3 py-1.5 text-xs font-bold shadow-float"
        >
          {b.text}
        </span>
      ))}
    </div>
  );
}
