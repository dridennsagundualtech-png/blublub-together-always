import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { ChevronRight, X } from "lucide-react";
import { MORE_LINKS, SoundToggle } from "@/components/MoreMenu";
import { useBadges } from "@/lib/badges";

/**
 * The side bar (what used to be the More tab). Slides in from the right when you swipe past the
 * last tab or tap the critter in the top corner; swipe it back, tap outside or press Esc to close.
 */
export function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: badges } = useBadges();
  const panelRef = useRef<HTMLElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className={`fixed inset-0 z-[70] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="More"
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          // A swipe back to the right closes it.
          if (s && e.clientX - s.x > 60 && Math.abs(e.clientY - s.y) < 80) onClose();
        }}
        className={`absolute inset-y-0 right-0 flex w-[min(84vw,340px)] flex-col bg-background shadow-float transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <h2 className="font-display text-xl font-extrabold">More</h2>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="press grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav aria-label="More" className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-1">
            {MORE_LINKS.map((s) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  onClick={onClose}
                  className="press flex items-center gap-3 rounded-2xl px-2 py-2.5 text-sm font-semibold hover:bg-muted"
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-2xl ${s.tint} text-primary`}
                  >
                    <s.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">{s.label}</span>
                  {"badge" in s && badges?.question ? (
                    <span className="size-2.5 rounded-full bg-destructive" aria-label="New" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <SoundToggle className="border-t border-border/40 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4" />
      </aside>
    </div>,
    document.body,
  );
}
