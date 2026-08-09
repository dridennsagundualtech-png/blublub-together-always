import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { playChirp } from "@/hooks/use-sound";
import { useAuthUser, useCoupleId, useMembers } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Private Chat — BLUBLUB" },
      { name: "description", content: "Real-time private messaging just for the two of you." },
      { property: "og:title", content: "Private Chat — BLUBLUB" },
      {
        property: "og:description",
        content: "Real-time private messaging just for the two of you.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: members } = useMembers();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["messages", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("created_at")
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Realtime updates for this couple's messages.
  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`messages-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          void qc.invalidateQueries({ queryKey: ["messages", coupleId] });
          const row = payload.new as { created_by: string; body: string };
          if (row.created_by !== user?.id) {
            playChirp("pop");
            notify(row.body);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc, user?.id]);

  // Mark partner messages as read whenever the thread is open.
  useEffect(() => {
    if (!coupleId || !user?.id || !messages) return;
    const unread = messages.filter((m) => m.created_by !== user.id && !m.read_at);
    if (unread.length === 0) return;
    void supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in(
        "id",
        unread.map((m) => m.id),
      )
      .then(() => qc.invalidateQueries({ queryKey: ["badges"] }));
  }, [messages, coupleId, user?.id, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("messages").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        body: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["messages", coupleId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nameOf = (id: string) => members?.find((m) => m.id === id)?.display_name ?? "Partner";

  return (
    <AppLayout title="Chat" subtitle="Just the two of you" critter="penguin">
      <div className="flex flex-col gap-2 pb-32">
        {(messages ?? []).map((m) => {
          const mine = m.created_by === user?.id;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-sm shadow-soft ${
                mine
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-card text-card-foreground"
              }`}
            >
              {!mine ? (
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                  {nameOf(m.created_by)}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send.mutate();
        }}
        className="fixed inset-x-0 bottom-16 z-40 mx-auto flex max-w-lg items-center gap-2 px-4 pb-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something sweet…"
          maxLength={2000}
          className="flex-1 rounded-full border border-border bg-card px-4 py-3 text-base shadow-soft outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!text.trim() || send.isPending}
          className="press grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft disabled:opacity-60"
        >
          <Send className="size-5" />
        </button>
      </form>
    </AppLayout>
  );
}

function notify(body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (document.visibilityState === "visible") return;
  if (Notification.permission === "granted") {
    new Notification("BLUBLUB", { body, icon: "/favicon.ico" });
  }
}
