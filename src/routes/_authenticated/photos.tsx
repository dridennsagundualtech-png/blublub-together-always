import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, MessageCircle, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, PrimaryButton, SectionTitle, TextInput } from "@/components/ui-kit";
import { todayISO } from "@/lib/badges";
import { compressImage } from "@/lib/image";
import { useAuthUser, useCoupleId, useMembers } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/photos")({
  head: () => ({
    meta: [
      { title: "Photo Timeline — BLUBLUB" },
      { name: "description", content: "A shared scrollable timeline of your favourite moments." },
      { property: "og:title", content: "Photo Timeline — BLUBLUB" },
      {
        property: "og:description",
        content: "A shared scrollable timeline of your favourite moments.",
      },
    ],
  }),
  component: PhotosPage,
});

function PhotosPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [takenOn, setTakenOn] = useState(todayISO());

  const { data: photos } = useQuery({
    queryKey: ["photos", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("taken_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const paths = (data ?? []).map((p) => p.storage_path);
      const signed = paths.length
        ? (await supabase.storage.from("photos").createSignedUrls(paths, 3600)).data ?? []
        : [];
      return (data ?? []).map((p, i) => ({ ...p, url: signed[i]?.signedUrl ?? null }));
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Pick a photo first");
      const blob = await compressImage(file);
      const path = `${coupleId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { error } = await supabase.from("photos").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        storage_path: path,
        caption: caption.trim() || null,
        taken_on: takenOn,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setFile(null);
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      void qc.invalidateQueries({ queryKey: ["photos"] });
      toast.success("Added to your timeline");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout title="Timeline" subtitle="Your favourite moments" critter="seal">
      <Card>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background py-6 text-sm font-bold text-muted-foreground"
          >
            <ImagePlus className="size-5" />
            {file ? file.name : "Choose a photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Field label="Caption">
            <TextInput
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              placeholder="That perfect afternoon"
            />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} />
          </Field>
          <PrimaryButton disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
            {upload.isPending ? "Uploading…" : "Add to timeline"}
          </PrimaryButton>
          <p className="text-center text-xs text-muted-foreground">
            Photos are resized before upload to keep things light.
          </p>
        </div>
      </Card>

      <SectionTitle>Timeline</SectionTitle>
      {!photos || photos.length === 0 ? (
        <Card className="text-sm text-muted-foreground">No photos yet.</Card>
      ) : (
        <ul className="space-y-4">
          {photos.map((p) => (
            <li key={p.id} className="card-soft overflow-hidden p-0">
              {p.url ? (
                <img
                  src={p.url}
                  alt={p.caption ?? "Shared memory"}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              ) : null}
              <div className="p-4">
                <p className="text-sm font-bold">{p.caption ?? "Untitled"}</p>
                <p className="text-xs text-muted-foreground">{p.taken_on}</p>
                <PhotoComments photoId={p.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}

function PhotoComments({ photoId }: { photoId: string }) {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: members } = useMembers();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data: comments } = useQuery({
    queryKey: ["photo-comments", photoId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_comments")
        .select("*")
        .eq("photo_id", photoId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!text) throw new Error("Write something first");
      const { error } = await supabase.from("photo_comments").insert({
        photo_id: photoId,
        couple_id: coupleId!,
        created_by: user!.id,
        body: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries({ queryKey: ["photo-comments", photoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("photo_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["photo-comments", photoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const nameOf = (id: string) =>
    members?.find((m) => m.id === id)?.display_name ?? (id === user?.id ? "You" : "Partner");

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <MessageCircle className="size-3.5" />
        {comments?.length ? `${comments.length} comment${comments.length > 1 ? "s" : ""}` : "Comments"}
      </p>

      {comments && comments.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-2 rounded-2xl bg-muted/60 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-primary">{nameOf(c.created_by)}</span>
                <span className="block whitespace-pre-wrap break-words text-sm">{c.body}</span>
              </span>
              {c.created_by === user?.id ? (
                <button
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => remove.mutate(c.id)}
                  className="press mt-0.5 shrink-0 text-muted-foreground"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <TextInput
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={300}
          placeholder="Say something sweet…"
          className="!py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!body.trim() || add.isPending}
          aria-label="Post comment"
          className="press grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
