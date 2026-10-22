import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Maximize2, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatThread } from "@/components/ChatThread";
import { playChirp } from "@/hooks/use-sound";
import { useBadges } from "@/lib/badges";
import { useAuthUser, useCoupleId, useMemberAvatars, usePartner } from "@/lib/session";

const SIZE = 56;
const EDGE = 12;
const POS_KEY = "blublub:chat-head";
/** Which side the head sits on and how far down the screen (0–1), remembered on this phone. */
type Pos = { side: "left" | "right"; y: number };

function loadPos(): Pos {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) ?? "null") as Pos | null;
    if (p && (p.side === "left" || p.side === "right") && typeof p.y === "number") return p;
  } catch {
    /* ignore */
  }
  return { side: "right", y: 0.68 };
}

/** Where the head may go: inside the app column, under the header, above the tab bar. */
function bounds() {
  const col = Math.max(0, (window.innerWidth - 512) / 2);
  return {
    left: col + EDGE,
    right: window.innerWidth - col - EDGE - SIZE,
    top: 76,
    bottom: window.innerHeight - 92 - SIZE,
  };
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The chat, floating on every screen (like Messenger's chat heads): your partner's photo with
 * the unread count. Tap to open the chat over whatever you're doing; drag it to either side.
 * It also listens for new messages app-wide: a chirp and a little preview pop out of it.
 */
export function ChatHead() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const partner = usePartner();
  const { data: avatars } = useMemberAvatars();
  const { data: badges } = useBadges();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pos, setPos] = useState<Pos>(loadPos);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [, setViewport] = useState(0);
  const press = useRef<{ x0: number; y0: number; dx: number; dy: number; moved: boolean } | null>(
    null,
  );
  const justDragged = useRef(false);
  const quiet = useRef(false); // chat already on screen: no preview pop
  const onChatPage = pathname === "/chat";
  quiet.current = open || onChatPage;

  // New messages, wherever you are in the app.
  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`chat-head-${coupleId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          void qc.invalidateQueries({ queryKey: ["messages", coupleId] });
          void qc.invalidateQueries({ queryKey: ["badges"] });
          const row = payload.new as { created_by: string; body: string | null };
          if (row.created_by === user?.id) return;
          const text = row.body?.trim() || "🎤 Voice note";
          playChirp("pop");
          notify(text);
          if (!quiet.current) setPreview(text);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc, user?.id]);

  useEffect(() => {
    if (!preview) return;
    const t = window.setTimeout(() => setPreview(null), 4500);
    return () => window.clearTimeout(t);
  }, [preview]);

  // Going to another screen (e.g. "Open full chat") closes the chat on top.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onResize = () => setViewport((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user || !coupleId || !partner) return null;

  const name = partner.display_name ?? "Partner";
  const photo = avatars?.[partner.id];
  const unread = badges?.unreadCount ?? 0;
  const b = bounds();
  const x = drag ? drag.x : pos.side === "left" ? b.left : b.right;
  const y = drag ? drag.y : clamp(pos.y * window.innerHeight, b.top, b.bottom);

  function openChat() {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    playChirp("tap");
    setPreview(null);
    setOpen(true);
  }

  return (
    <>
      {!open && !onChatPage ? (
        <div
          className="fixed z-[45]"
          style={{
            left: x,
            top: y,
            width: SIZE,
            height: SIZE,
            transition: drag ? "none" : "left 0.25s ease-out, top 0.25s ease-out",
          }}
        >
          {preview ? (
            <button
              type="button"
              onClick={openChat}
              className={`rise-in absolute top-1/2 w-max max-w-[220px] -translate-y-1/2 rounded-2xl bg-card px-3 py-2 text-left text-xs shadow-float ${
                pos.side === "right" ? "right-[calc(100%+8px)]" : "left-[calc(100%+8px)]"
              }`}
            >
              <span className="block font-bold">{name}</span>
              <span className="line-clamp-2 text-muted-foreground">{preview}</span>
            </button>
          ) : null}
          <button
            type="button"
            aria-label={`Chat with ${name}${unread ? `, ${unread} unread` : ""}`}
            onClick={openChat}
            onPointerDown={(e) => {
              press.current = {
                x0: e.clientX,
                y0: e.clientY,
                dx: e.clientX - x,
                dy: e.clientY - y,
                moved: false,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const p = press.current;
              if (!p) return;
              if (!p.moved && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 6) return;
              p.moved = true;
              setDrag({ x: e.clientX - p.dx, y: clamp(e.clientY - p.dy, b.top, b.bottom) });
            }}
            onPointerUp={() => {
              const p = press.current;
              press.current = null;
              if (!p?.moved || !drag) return;
              // Let go: snap to the nearest side, remember the spot.
              justDragged.current = true;
              const next: Pos = {
                side: drag.x + SIZE / 2 < window.innerWidth / 2 ? "left" : "right",
                y: drag.y / window.innerHeight,
              };
              setPos(next);
              setDrag(null);
              try {
                localStorage.setItem(POS_KEY, JSON.stringify(next));
              } catch {
                /* ignore */
              }
            }}
            onPointerCancel={() => {
              press.current = null;
              setDrag(null);
            }}
            data-no-page-swipe
            className="press grid size-full touch-none select-none place-items-center overflow-hidden rounded-full border-[3px] border-white text-primary-foreground shadow-float"
            style={{ background: "var(--color-primary)" }}
          >
            {photo ? (
              <img src={photo} alt="" draggable={false} className="size-full object-cover" />
            ) : (
              <MessageCircle className="size-6" />
            )}
          </button>
          {unread ? (
            <span className="pointer-events-none absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground shadow-soft">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </div>
      ) : null}

      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Chat with ${name}`}
              className="fixed inset-0 z-[75] flex items-end justify-center bg-black/35"
              onClick={(e) => e.target === e.currentTarget && setOpen(false)}
            >
              <div className="rise-in flex h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] bg-background shadow-float">
                <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 text-primary">
                    {photo ? (
                      <img src={photo} alt="" className="size-full object-cover" />
                    ) : (
                      <MessageCircle className="size-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{name}</span>
                    <span className="block text-xs text-muted-foreground">Just the two of you</span>
                  </span>
                  <Link
                    to="/chat"
                    aria-label="Open the full chat"
                    className="press grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  >
                    <Maximize2 className="size-4" />
                  </Link>
                  <button
                    type="button"
                    aria-label="Close chat"
                    onClick={() => setOpen(false)}
                    className="press grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <ChatThread variant="sheet" />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function notify(body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (document.visibilityState === "visible") return;
  if (Notification.permission === "granted") {
    new Notification("BLUBLUB", { body, icon: "/favicon.ico" });
  }
}
