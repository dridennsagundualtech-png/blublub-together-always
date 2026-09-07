import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Palette, RotateCcw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, PrimaryButton } from "@/components/ui-kit";
import { useCouple, useCoupleId } from "@/lib/session";

const COLORS = [
  { id: "blush", hex: "#FFAFCC", label: "Blush", emoji: "💗" },
  { id: "petal", hex: "#FFC8DD", label: "Petal", emoji: "🌸" },
  { id: "orchid", hex: "#CDB4DB", label: "Orchid", emoji: "💜" },
  { id: "icy", hex: "#BDE0FE", label: "Icy", emoji: "❄️" },
  { id: "sky", hex: "#A2D2FF", label: "Sky", emoji: "☁️" },
  { id: "alabaster", hex: "#D8E2DC", label: "Alabaster", emoji: "🤍" },
  { id: "powder", hex: "#FFE5D9", label: "Powder", emoji: "🍑" },
  { id: "pastel", hex: "#FFCAD4", label: "Pastel", emoji: "🎀" },
  { id: "cherry", hex: "#F4ACB7", label: "Cherry", emoji: "🍒" },
  { id: "mauve", hex: "#9D8189", label: "Mauve", emoji: "🥀" },
] as const;

type Slot =
  | "main"
  | "soft"
  | "purple"
  | "blue"
  | "gradFrom"
  | "gradTo"
  | "boxGradFrom"
  | "boxGradTo";

export type ThemeMap = {
  main: string;
  soft: string;
  purple: string;
  blue: string;
  gradFrom: string;
  gradTo: string;
  boxesGradient: boolean;
  boxGradFrom: string;
  boxGradTo: string;
};

const DEFAULTS: ThemeMap = {
  main: "#FFAFCC",
  soft: "#FFC8DD",
  purple: "#CDB4DB",
  blue: "#A2D2FF",
  gradFrom: "#CDB4DB",
  gradTo: "#FFAFCC",
  boxesGradient: false,
  boxGradFrom: "#FFFFFF",
  boxGradTo: "#FFC8DD",
};

const STORAGE_KEY = "blublub-theme-v2";

export function applyColors(map: ThemeMap) {
  const root = document.documentElement;
  root.style.setProperty("--primary", map.main);
  root.style.setProperty("--ring", map.main);
  root.style.setProperty("--sidebar-primary", map.main);
  root.style.setProperty("--chart-1", map.main);

  root.style.setProperty("--petal", map.soft);
  root.style.setProperty("--peach", map.soft);
  root.style.setProperty("--secondary", map.soft);
  root.style.setProperty("--chart-5", map.soft);

  root.style.setProperty("--accent", map.purple);
  root.style.setProperty("--lavender", map.purple);
  root.style.setProperty("--sidebar-accent", map.purple);
  root.style.setProperty("--chart-2", map.purple);

  root.style.setProperty("--sky", map.blue);
  root.style.setProperty("--icy", map.blue === "#A2D2FF" ? "#BDE0FE" : map.blue);
  root.style.setProperty("--chart-3", map.blue);
  root.style.setProperty("--chart-4", map.blue === "#A2D2FF" ? "#BDE0FE" : map.blue);

  root.style.setProperty("--grad-featured-from", map.gradFrom);
  root.style.setProperty("--grad-featured-to", map.gradTo);
  root.style.setProperty("--grad-hero-from", map.gradFrom);
  root.style.setProperty("--grad-hero-to", map.gradTo);
  root.style.setProperty("--grad-panel-from", map.gradFrom);
  root.style.setProperty("--grad-panel-to", map.gradTo);

  root.style.setProperty("--box-grad-from", map.boxGradFrom || map.soft);
  root.style.setProperty("--box-grad-to", map.boxGradTo || map.main);
  document.documentElement.classList.toggle("boxes-gradient", !!map.boxesGradient);
}

function normalizeTheme(raw: unknown): ThemeMap {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  const o = raw as Record<string, unknown>;
  if (typeof o.main === "string") {
    return {
      main: (o.main as string) || DEFAULTS.main,
      soft: (o.soft as string) || DEFAULTS.soft,
      purple: (o.purple as string) || DEFAULTS.purple,
      blue: (o.blue as string) || DEFAULTS.blue,
      gradFrom: (o.gradFrom as string) || (o.purple as string) || DEFAULTS.gradFrom,
      gradTo: (o.gradTo as string) || (o.main as string) || DEFAULTS.gradTo,
      boxesGradient: !!o.boxesGradient,
      boxGradFrom: (o.boxGradFrom as string) || DEFAULTS.soft,
      boxGradTo: (o.boxGradTo as string) || DEFAULTS.main,
    };
  }
  return { ...DEFAULTS };
}

const SLOT_META: { id: Slot; title: string; hint: string }[] = [
  { id: "main", title: "Main color", hint: "Buttons & highlights" },
  { id: "soft", title: "Soft color", hint: "Gentle cards" },
  { id: "purple", title: "Purple color", hint: "Accents & tiles" },
  { id: "blue", title: "Blue color", hint: "Calm tiles & sky" },
  { id: "gradFrom", title: "Gradient start", hint: "Featured cards" },
  { id: "gradTo", title: "Gradient end", hint: "Featured cards" },
  { id: "boxGradFrom", title: "Box gradient start", hint: "All boxes" },
  { id: "boxGradTo", title: "Box gradient end", hint: "All boxes" },
];

export function ThemeEditor({ compact = false }: { compact?: boolean }) {
  const coupleId = useCoupleId();
  const { data: couple } = useCouple();
  const qc = useQueryClient();
  const [map, setMap] = useState<ThemeMap>(DEFAULTS);
  const [active, setActive] = useState<Slot>("main");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const fromCouple = (couple as { theme?: unknown } | null | undefined)?.theme;
    if (fromCouple) {
      const next = normalizeTheme(fromCouple);
      setMap(next);
      applyColors(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setLoaded(true);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const next = normalizeTheme(JSON.parse(raw));
        setMap(next);
        applyColors(next);
      }
    } catch {}
    setLoaded(true);
  }, [couple, loaded]);

  useEffect(() => {
    if (!loaded) return;
    applyColors(map);
  }, [map, loaded]);

  async function saveShared(next: ThemeMap) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    applyColors(next);
    if (!coupleId) {
      toast.message("Pair with your partner to share colors");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("couples")
        .update({ theme: next } as never)
        .eq("id", coupleId);
      if (error) throw error;
      void qc.invalidateQueries({ queryKey: ["couple", coupleId] });
      toast.success("Colors shared with both of you 🩷");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("theme") || msg.includes("column")) {
        toast.error("Run the theme SQL migration in Supabase first");
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  function pick(hex: string) {
    setMap((m) => ({ ...m, [active]: hex }));
  }

  function reset() {
    const next = { ...DEFAULTS };
    setMap(next);
    void saveShared(next);
  }

  const activeLabel = SLOT_META.find((s) => s.id === active)?.title ?? active;

  return (
    <Card className={compact ? "mt-0" : "mt-4"}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          <p className="text-sm font-bold">Our app colors</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="press flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2">
        <Users className="size-4 shrink-0 text-primary" />
        <p className="text-[11px] font-semibold leading-snug text-foreground">
          Shared with both of you — pick colors & gradients together.
        </p>
      </div>

      <div className="mb-4 overflow-hidden rounded-[1.25rem] border border-border bg-background p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Live preview
        </p>
        <div className="flex gap-2">
          <div
            className="flex h-10 flex-1 items-center justify-center rounded-full text-xs font-bold shadow-soft"
            style={{ backgroundColor: map.main, color: "#3F2A3A" }}
          >
            Button
          </div>
          <div
            className="flex h-10 flex-1 items-center justify-center rounded-2xl text-xs font-bold"
            style={{ backgroundColor: map.soft, color: "#3F2A3A" }}
          >
            Soft card
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <div
            className="flex h-14 flex-1 flex-col justify-between rounded-2xl p-2"
            style={{ backgroundColor: map.purple, color: "#3F2A3A" }}
          >
            <span className="text-[9px] font-bold opacity-70">Tile</span>
            <span className="text-xs font-bold">Accent</span>
          </div>
          <div
            className="flex h-14 flex-1 flex-col justify-between rounded-2xl p-2"
            style={{ backgroundColor: map.blue, color: "#3F2A3A" }}
          >
            <span className="text-[9px] font-bold opacity-70">Tile</span>
            <span className="text-xs font-bold">Calm</span>
          </div>
        </div>
        <div
          className="mt-2 flex h-14 items-center justify-between rounded-2xl px-3"
          style={{
            background: `linear-gradient(135deg, ${map.gradFrom}, ${map.gradTo})`,
            color: "#3F2A3A",
          }}
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">Gradient</p>
            <p className="text-xs font-bold">Featured card</p>
          </div>
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold">Open</span>
        </div>
        {map.boxesGradient ? (
          <div
            className="mt-2 flex h-10 items-center justify-center rounded-2xl text-xs font-bold"
            style={{
              background: `linear-gradient(145deg, ${map.boxGradFrom}, ${map.boxGradTo})`,
              color: "#3F2A3A",
            }}
          >
            All boxes use this gradient
          </div>
        ) : null}
      </div>

      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Solid colors
      </p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {SLOT_META.filter((s) => !s.id.startsWith("grad") && !s.id.startsWith("box")).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={`press flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition-colors ${
              active === s.id ? "border-foreground bg-muted" : "border-transparent bg-muted/50"
            }`}
          >
            <span
              className="size-8 shrink-0 rounded-xl shadow-soft"
              style={{ backgroundColor: map[s.id as keyof ThemeMap] as string }}
            />
            <span>
              <span className="block text-xs font-bold">{s.title}</span>
              <span className="block text-[10px] text-muted-foreground">{s.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Featured gradient
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActive("gradFrom")}
          className={`press flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left ${
            active === "gradFrom" ? "border-foreground bg-muted" : "border-transparent bg-muted/50"
          }`}
        >
          <span className="size-8 rounded-xl" style={{ backgroundColor: map.gradFrom }} />
          <span className="text-xs font-bold">Start</span>
        </button>
        <button
          type="button"
          onClick={() => setActive("gradTo")}
          className={`press flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left ${
            active === "gradTo" ? "border-foreground bg-muted" : "border-transparent bg-muted/50"
          }`}
        >
          <span className="size-8 rounded-xl" style={{ backgroundColor: map.gradTo }} />
          <span className="text-xs font-bold">End</span>
        </button>
      </div>
      <div
        className="mb-3 h-8 w-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${map.gradFrom}, ${map.gradTo})` }}
      />

      <div className="mb-3 flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5">
        <div>
          <p className="text-xs font-bold">Gradient all boxes</p>
          <p className="text-[10px] text-muted-foreground">Cards & panels across the app</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={map.boxesGradient}
          onClick={() => setMap((m) => ({ ...m, boxesGradient: !m.boxesGradient }))}
          className={`press h-7 w-12 shrink-0 rounded-full transition-colors ${
            map.boxesGradient ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`block size-6 rounded-full bg-card shadow-soft transition-transform ${
              map.boxesGradient ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {map.boxesGradient ? (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActive("boxGradFrom")}
            className={`press flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left ${
              active === "boxGradFrom" ? "border-foreground bg-muted" : "border-transparent bg-muted/50"
            }`}
          >
            <span className="size-8 rounded-xl" style={{ backgroundColor: map.boxGradFrom }} />
            <span className="text-xs font-bold">Box start</span>
          </button>
          <button
            type="button"
            onClick={() => setActive("boxGradTo")}
            className={`press flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left ${
              active === "boxGradTo" ? "border-foreground bg-muted" : "border-transparent bg-muted/50"
            }`}
          >
            <span className="size-8 rounded-xl" style={{ backgroundColor: map.boxGradTo }} />
            <span className="text-xs font-bold">Box end</span>
          </button>
        </div>
      ) : null}

      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Tap a color for “{SLOT_META.find((s) => s.id === active)?.title ?? active}”
      </p>

      <div className="grid grid-cols-5 gap-2">
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => pick(c.hex)}
            className="press flex flex-col items-center gap-1"
          >
            <span
              className={`grid size-11 place-items-center rounded-2xl text-base shadow-soft transition-transform ${
                (map as Record<string, string | boolean>)[active] === c.hex
                  ? "scale-110 ring-2 ring-foreground ring-offset-2"
                  : ""
              }`}
              style={{ backgroundColor: c.hex }}
            >
              {c.emoji}
            </span>
            <span className="text-[8px] font-semibold leading-tight text-muted-foreground">
              {c.label}
            </span>
          </button>
        ))}
      </div>

      <PrimaryButton className="mt-4" disabled={saving} onClick={() => void saveShared(map)}>
        {saving ? "Saving…" : "Save for both of us"}
      </PrimaryButton>
    </Card>
  );
}
