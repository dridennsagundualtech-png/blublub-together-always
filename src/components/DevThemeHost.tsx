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

/**
 * Developer mode: on every screen, tap a box to set solid color or gradient.
 * Enable from Appearance → Developer mode.
 */
export function DevThemeHost() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const coupleId = useCoupleId();
  const qc = useQueryClient();
  const [devOn, setDevOn] = useState(false);
  const [map, setMap] = useState<ThemeMap>(() => loadTheme());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEl, setEditingEl] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState<BoxOverride>({ mode: "default" });

  // Sync dev flag from storage (Appearance toggle writes this)
  useEffect(() => {
    const read = () => setDevOn(localStorage.getItem(DEV_MODE_KEY) === "1");
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEV_MODE_KEY) read();
    };
    window.addEventListener("storage", onStorage);
    // custom event for same-tab toggle
    window.addEventListener("blublub-dev-mode", read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("blublub-dev-mode", read);
    };
  }, []);

  // Re-stamp boxes when route or theme overrides change
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

  // Outline boxes while developer mode is on

  // Outline editable boxes while developer mode is on
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
    document.documentElement.classList.toggle("dev-theme-on", devOn);
    if (!devOn) {
      setEditingId(null);
      setEditingEl(null);
    }
  }, [devOn]);

  const onCaptureClick = useCallback(
    (e: MouseEvent) => {
      if (!devOn) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // ignore clicks inside the editor chrome
      if (target.closest("[data-dev-theme-ui]")) return;

      const el = target.closest(BOX_SELECTORS) as HTMLElement | null;
      if (!el) return;

      e.preventDefault();
      e.stopPropagation();

      const id = makeBoxId(el, pathname);
      el.setAttribute("data-theme-box", id);
      const current = loadTheme().boxOverrides?.[id] ?? { mode: "default" as const };
      setDraft({ ...current });
      setEditingId(id);
      setEditingEl(el);

      // highlight
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
        // local still saved
      }
    }
  }

  function applyDraft() {
    if (!editingId) return;
    const next: ThemeMap = {
      ...loadTheme(),
      boxOverrides: { ...loadTheme().boxOverrides },
    };
    if (draft.mode === "default") {
      delete next.boxOverrides[editingId];
    } else {
      next.boxOverrides[editingId] = { ...draft };
    }
    void persist(next);
    if (editingEl) applyBoxOverrideToEl(editingEl, draft.mode === "default" ? undefined : draft);
    toast.success(draft.mode === "default" ? "Box reset to default" : "Box style saved");
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

  if (!devOn) return null;

  return (
    <>
      {/* Floating pill */}
      <div
        data-dev-theme-ui
        className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-3 py-2 text-background shadow-lg"
      >
        <Paintbrush className="size-3.5" />
        <span className="text-[11px] font-bold">Dev mode — tap any box</span>
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

      {/* Editor sheet */}
      {editingId ? (
        <div
          data-dev-theme-ui
          className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-lg rounded-t-3xl border border-border bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl"
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
                ["solid", "Solid color"],
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
              <div
                className="h-10 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${draft.gradFrom || map.gradFrom}, ${draft.gradTo || map.gradTo})`,
                }}
              />
            </div>
          ) : null}

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
