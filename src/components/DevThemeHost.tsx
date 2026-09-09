import { useCallback, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Paintbrush, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleId } from "@/lib/session";
import {
  applyBoxOverrideToEl,
  applyColors,
  BOX_SELECTORS,
  DEV_MODE_KEY,
  makeBoxId,
  normalizeTheme,
  stampAndApplyBoxOverrides,
  THEME_DEFAULTS,
  THEME_STORAGE_KEY,
  type BoxOverride,
  type ThemeMap,
} from "@/lib/theme";

const PRESET_COLORS = [
  "#FFAFCC",
  "#FFC8DD",
  "#CDB4DB",
  "#BDE0FE",
  "#A2D2FF",
  "#D8E2DC",
  "#FFE5D9",
  "#FFCAD4",
  "#F4ACB7",
  "#9D8189",
  "#8E97FD",
  "#1F2757",
  "#FFFFFF",
  "#F2F2F2",
];

function loadTheme(): ThemeMap {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) return normalizeTheme(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return { ...THEME_DEFAULTS, boxOverrides: {} };
}

function saveThemeLocal(map: ThemeMap) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(map));
}

export function DevThemeHost() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const coupleId = useCoupleId();
  const qc = useQueryClient();
  const [devOn, setDevOn] = useState(false);
  const [map, setMap] = useState<ThemeMap>(() => loadTheme());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEl, setEditingEl] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState<BoxOverride>({
    mode: "default",
    anim: "none",
    shadow: "default",
  });
  const [showGlobal, setShowGlobal] = useState(false);

  useEffect(() => {
    const read = () => setDevOn(localStorage.getItem(DEV_MODE_KEY) === "1");
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEV_MODE_KEY) read();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("blublub-dev-mode", read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("blublub-dev-mode", read);
    };
  }, []);

  useEffect(() => {
    if (!document.getElementById("dev-theme-css")) {
      const style = document.createElement("style");
      style.id = "dev-theme-css";
      style.textContent = `
        html.dev-theme-on .card-soft,
        html.dev-theme-on .card-raised,
        html.dev-theme-on .card-outline,
        html.dev-theme-on .surface-quiet,
        html.dev-theme-on .grad-box,
        html.dev-theme-on .panel-dark,
        html.dev-theme-on .featured-gradient,
        html.dev-theme-on [data-theme-box] {
          outline: 2px dashed rgba(142, 151, 253, 0.85);
          outline-offset: 2px;
          cursor: pointer;
        }
        html.dev-theme-on [data-theme-selected] {
          outline: 3px solid #8E97FD !important;
          outline-offset: 3px;
        }
        html.dev-theme-on [data-theme-overridden] {
          outline-style: solid;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    const theme = loadTheme();
    setMap(theme);
    applyColors(theme, pathname);
    const t = window.setTimeout(() => stampAndApplyBoxOverrides(theme, pathname), 50);
    const t2 = window.setTimeout(() => stampAndApplyBoxOverrides(theme, pathname), 300);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [pathname, devOn]);

  useEffect(() => {
    document.documentElement.classList.toggle("dev-theme-on", devOn);
    if (!devOn) {
      setEditingId(null);
      setEditingEl(null);
      setShowGlobal(false);
    }
  }, [devOn]);

  const onCaptureClick = useCallback(
    (e: MouseEvent) => {
      if (!devOn) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-dev-theme-ui]")) return;

      const el = target.closest(BOX_SELECTORS) as HTMLElement | null;
      if (!el) return;

      e.preventDefault();
      e.stopPropagation();

      const id = makeBoxId(el, pathname);
      el.setAttribute("data-theme-box", id);
      const current = loadTheme().boxOverrides?.[id] ?? {
        mode: "default" as const,
        anim: "none" as const,
        shadow: "default" as const,
      };
      setDraft({ ...current });
      setEditingId(id);
      setEditingEl(el);
      setShowGlobal(false);

      document.querySelectorAll("[data-theme-selected]").forEach((n) => n.removeAttribute("data-theme-selected"));
      el.setAttribute("data-theme-selected", "1");
    },
    [devOn, pathname],
  );

  useEffect(() => {
    if (!devOn) return;
    document.addEventListener("click", onCaptureClick, true);
    return () => document.removeEventListener("click", onCaptureClick, true);
  }, [devOn, onCaptureClick]);

  async function persist(next: ThemeMap) {
    setMap(next);
    saveThemeLocal(next);
    applyColors(next, pathname);
    stampAndApplyBoxOverrides(next, pathname);
    if (coupleId) {
      try {
        await supabase
          .from("couples")
          .update({ theme: JSON.stringify(next) } as never)
          .eq("id", coupleId);
        void qc.invalidateQueries({ queryKey: ["couple", coupleId] });
      } catch {
        /* local still saved */
      }
    }
  }

  function applyDraft() {
    if (!editingId) return;
    const base = loadTheme();
    const next: ThemeMap = {
      ...base,
      boxOverrides: { ...base.boxOverrides },
    };
    const anim = draft.anim ?? "none";
    const shadow = draft.shadow ?? "default";
    const image = (draft.image || "").trim();
    const isEmpty =
      draft.mode === "default" && anim === "none" && shadow === "default" && !image;
    if (isEmpty) {
      delete next.boxOverrides[editingId];
    } else {
      const savedDraft: BoxOverride = {
        ...draft,
        anim,
        shadow,
        ...(image ? { image } : {}),
      };
      if (!image) delete savedDraft.image;
      next.boxOverrides[editingId] = savedDraft;
    }
    void persist(next);
    if (editingEl) {
      applyBoxOverrideToEl(
        editingEl,
        isEmpty
          ? undefined
          : next.boxOverrides[editingId],
      );
    }
    toast.success(isEmpty ? "Box reset to default" : "Box style saved");
    setEditingId(null);
    setEditingEl(null);
    document.querySelectorAll("[data-theme-selected]").forEach((n) => n.removeAttribute("data-theme-selected"));
  }

  function clearAllBoxOverrides() {
    const next = { ...loadTheme(), boxOverrides: {} };
    void persist(next);
    toast.success("All box overrides cleared");
    setEditingId(null);
  }

  function updateCorners(value: number) {
    const next = { ...loadTheme(), cornerRadius: value };
    void persist(next);
  }

  if (!devOn) return null;

  return (
    <>
      <div
        data-dev-theme-ui
        className="fixed bottom-24 left-1/2 z-[60] flex max-w-[95vw] -translate-x-1/2 flex-col items-center gap-2"
      >
        {showGlobal ? (
          <div className="w-[min(22rem,92vw)] rounded-2xl border border-border bg-card p-3 shadow-lg">
            <p className="mb-1 text-xs font-bold">Edge sharpness (whole app)</p>
            <p className="mb-2 text-[10px] text-muted-foreground">
              Left = sharper · Right = rounder
            </p>
            <input
              type="range"
              min={0.35}
              max={2.2}
              step={0.05}
              value={map.cornerRadius ?? 1.25}
              onChange={(e) => updateCorners(Number(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-center text-[10px] font-semibold text-muted-foreground">
              {(map.cornerRadius ?? 1.25).toFixed(2)} rem
            </p>
          </div>
        ) : null}

        <div className="flex items-center gap-2 rounded-full bg-foreground px-3 py-2 text-background shadow-lg">
          <Paintbrush className="size-3.5 shrink-0" />
          <span className="text-[11px] font-bold">Dev — tap a box</span>
          <button
            type="button"
            className="rounded-full bg-background/20 px-2 py-0.5 text-[10px] font-bold"
            onClick={() => setShowGlobal((v) => !v)}
          >
            Corners
          </button>
          <button
            type="button"
            className="rounded-full bg-background/20 px-2 py-0.5 text-[10px] font-bold"
            onClick={() => {
              localStorage.setItem(DEV_MODE_KEY, "0");
              window.dispatchEvent(new Event("blublub-dev-mode"));
              setDevOn(false);
            }}
          >
            Off
          </button>
        </div>
      </div>

      {editingId ? (
        <div
          data-dev-theme-ui
          className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[85vh] max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold">Edit this box</p>
              <p className="truncate text-[10px] text-muted-foreground">{editingId}</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="press grid size-8 place-items-center rounded-full bg-muted"
              onClick={() => {
                setEditingId(null);
                setEditingEl(null);
                document
                  .querySelectorAll("[data-theme-selected]")
                  .forEach((n) => n.removeAttribute("data-theme-selected"));
              }}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mb-3 flex gap-2">
            {(
              [
                ["default", "Default"],
                ["solid", "Solid"],
                ["gradient", "Gradient"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, mode }))}
                className={`press flex-1 rounded-full py-2 text-[11px] font-bold ${
                  draft.mode === mode
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {draft.mode === "solid" ? (
            <div className="mb-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Color
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={hex}
                    onClick={() => setDraft((d) => ({ ...d, solid: hex }))}
                    className={`size-8 rounded-full border-2 ${
                      draft.solid === hex ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={draft.solid || "#FFAFCC"}
                onChange={(e) => setDraft((d) => ({ ...d, solid: e.target.value }))}
                className="mt-2 h-9 w-full cursor-pointer rounded-lg"
              />
            </div>
          ) : null}

          {draft.mode === "gradient" ? (
            <div className="mb-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Gradient
              </p>
              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-1 text-[10px] font-semibold">
                  From
                  <input
                    type="color"
                    value={draft.gradFrom || map.gradFrom}
                    onChange={(e) => setDraft((d) => ({ ...d, gradFrom: e.target.value }))}
                    className="h-9 w-full cursor-pointer rounded-lg"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-[10px] font-semibold">
                  To
                  <input
                    type="color"
                    value={draft.gradTo || map.gradTo}
                    onChange={(e) => setDraft((d) => ({ ...d, gradTo: e.target.value }))}
                    className="h-9 w-full cursor-pointer rounded-lg"
                  />
                </label>
              </div>
            </div>
          ) : null}


          <div className="mb-3 rounded-2xl border border-border bg-muted/30 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Picture (covers box)
            </p>
            <p className="mb-2 text-[10px] text-muted-foreground">
              Overwrites solid / gradient — like illustrated cards
            </p>
            {draft.image ? (
              <div
                className="mb-2 h-20 rounded-xl bg-cover bg-center"
                style={{ backgroundImage: `url(${draft.image})` }}
              />
            ) : null}
            <input
              type="url"
              placeholder="Paste image link (https://…)"
              value={draft.image?.startsWith("data:") ? "" : draft.image || ""}
              onChange={(e) => {
                const value = e.target.value.trim();
                setDraft((d) => {
                  const { image: _image, ...rest } = d;
                  return value ? { ...rest, image: value } : rest;
                });
              }}
              className="mb-2 w-full rounded-full border border-border bg-background px-3 py-2 text-xs"
            />
            <div className="flex gap-2">
              <label className="press flex flex-1 cursor-pointer items-center justify-center rounded-full bg-primary py-2 text-[11px] font-bold text-primary-foreground">
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (file.size > 2_500_000) {
                      toast.error("Use a smaller image (under ~2.5 MB)");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = String(reader.result || "");
                      // shrink large data URLs via canvas
                      const img = new Image();
                      img.onload = () => {
                        const max = 900;
                        let { width, height } = img;
                        if (width > max || height > max) {
                          const scale = max / Math.max(width, height);
                          width = Math.round(width * scale);
                          height = Math.round(height * scale);
                        }
                        const canvas = document.createElement("canvas");
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) {
                          setDraft((d) => ({ ...d, image: result }));
                          return;
                        }
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressed = canvas.toDataURL("image/jpeg", 0.82);
                        setDraft((d) => ({ ...d, image: compressed }));
                        toast.message("Picture added — Save box");
                      };
                      img.onerror = () => {
                        setDraft((d) => ({ ...d, image: result }));
                      };
                      img.src = result;
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {draft.image ? (
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => {
                      const { image: _image, ...rest } = d;
                      return rest;
                    })
                  }
                  className="press rounded-full bg-muted px-3 py-2 text-[11px] font-bold text-muted-foreground"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className="mb-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Shadow (this box)
            </p>
            <div className="flex gap-2">
              {(
                [
                  ["default", "Default"],
                  ["on", "On"],
                  ["off", "Off"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, shadow: id }))}
                  className={`press flex-1 rounded-full py-2 text-[11px] font-bold ${
                    (draft.shadow ?? "default") === id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Animation
            </p>
            <div className="flex gap-2">
              {(
                [
                  ["none", "None"],
                  ["flow", "Flow"],
                  ["shine", "Shine"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, anim: id }))}
                  className={`press flex-1 rounded-full py-2 text-[11px] font-bold ${
                    (draft.anim ?? "none") === id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyDraft}
              className="press flex-1 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground"
            >
              Save box
            </button>
            <button
              type="button"
              onClick={clearAllBoxOverrides}
              className="press rounded-full bg-muted px-3 py-3 text-[11px] font-bold text-muted-foreground"
            >
              Clear all
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
