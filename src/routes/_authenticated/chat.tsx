import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { VoiceNote } from "@/components/VoiceNote";
import { playChirp } from "@/hooks/use-sound";
import { useAuthUser, useCoupleId, useMemberAvatars, useMembers } from "@/lib/session";

/** Small round avatar next to every bubble — uses the profile photo when set. */
function ChatAvatar({ userId, name }: { userId: string; name: string }) {
  const { data: avatars } = useMemberAvatars();
  const url = avatars?.[userId];
  return (
    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-xs font-bold text-accent-foreground shadow-soft">
      {url ? (
        <img src={url} alt={name} className="size-full object-cover" />
      ) : (
        (name.trim()[0] ?? "?").toUpperCase()
      )}
    </span>
  );
}


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
      .channel(`messages-${coupleId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          void qc.invalidateQueries({ queryKey: ["messages", coupleId] });
          const row = payload.new as { created_by: string; body: string };
          if (row.created_by !== user?.id) {
            playChirp("pop");
            notify(row.body || "🎤 Voice note");
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

  const sendVoice = useMutation({
    mutationFn: async ({ blob, durationMs }: { blob: Blob; durationMs: number }) => {
      const path = `${coupleId}/${user!.id}-${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("voice")
        .upload(path, blob, { contentType: blob.type || "audio/webm" });
      if (upErr) throw upErr;
      const { error } = await supabase.from("messages").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        body: "",
        audio_path: path,
        duration_ms: durationMs,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["messages", coupleId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Voice recording (foreground, MediaRecorder).
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const [recording, setRecording] = useState(false);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const durationMs = Date.now() - startedAtRef.current;
        if (blob.size > 0 && durationMs > 500) sendVoice.mutate({ blob, durationMs });
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      playChirp("pop");
    } catch {
      toast.error("Microphone permission is needed for voice notes");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    playChirp("tap");
  }

  const nameOf = (id: string) => members?.find((m) => m.id === id)?.display_name ?? "Partner";

  const share = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from("photos").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        storage_path: null,
        body,
        taken_on: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shared to your Memories feed");
      void qc.invalidateQueries({ queryKey: ["photos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout title="Chat" subtitle="Just the two of you" critter="penguin">
      <div className="flex flex-col gap-2 pb-32">
        {(messages ?? []).map((m) => {
          const mine = m.created_by === user?.id;
          return (
            <div
              key={m.id}
              className={`flex max-w-[85%] items-end gap-2 ${mine ? "self-end flex-row-reverse" : "self-start"}`}
            >
              <ChatAvatar userId={m.created_by} name={mine ? "You" : nameOf(m.created_by)} />
              <div
                className={`px-4 py-2.5 text-sm shadow-soft ${
                  mine
                    ? "rounded-3xl rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-3xl rounded-bl-md border border-border bg-cream text-foreground"
                }`}
              >
                {!mine ? (
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {nameOf(m.created_by)}
                  </p>
                ) : null}
                {m.audio_path ? (
                  <VoiceNote path={m.audio_path} durationMs={m.duration_ms} mine={mine} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.body}</p>
                )}
              </div>
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
        className="fixed inset-x-0 bottom-16 z-40 mx-auto mb-2 flex max-w-lg items-center gap-2 px-4 pb-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={recording ? "Recording…" : "Say something sweet…"}
          maxLength={2000}
          className="flex-1 rounded-full border border-border bg-card px-4 py-3 text-base shadow-soft outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          aria-label={recording ? "Stop recording" : "Record a voice note"}
          onClick={() => (recording ? stopRecording() : void startRecording())}
          disabled={sendVoice.isPending}
          className={`press grid size-12 shrink-0 place-items-center rounded-full shadow-soft disabled:opacity-60 ${
            recording ? "bg-destructive text-destructive-foreground" : "bg-card text-primary"
          }`}
        >
          {recording ? <Square className="size-5" /> : <Mic className="size-5" />}
        </button>
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
