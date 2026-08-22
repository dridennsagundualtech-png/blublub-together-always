import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, MapPin, MessageCircle, Send, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumAccess } from "@/lib/admin";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, PrimaryButton, SectionTitle, TextInput } from "@/components/ui-kit";
import { todayISO } from "@/lib/badges";
import { compressImage } from "@/lib/image";
import { useAuthUser, useCoupleId, useMembers, useProfile } from "@/lib/session";

const FREE_BATCH = 1;
const PREMIUM_EXTRA = 5;

export const Route = createFileRoute("/_authenticated/photos")({
  head: () => ({
    meta: [
      { title: "Memories — BLUBLUB" },
      { name: "description", content: "A shared gallery of your favourite moments together." },
      { property: "og:title", content: "Memories — BLUBLUB" },
      {
        property: "og:description",
        content: "A shared gallery of your favourite moments together.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PhotosPage,
});

type PhotoWithUrl = {
  id: string;
  caption: string | null;
  location: string | null;
  taken_on: string;
  created_by: string;
  url: string | null;
};

function PhotosPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [place, setPlace] = useState("");
  const [takenOn, setTakenOn] = useState(todayISO());
  const [open, setOpen] = useState<PhotoWithUrl | null>(null);

  const isPremium = usePremiumAccess();
  const maxBatch = isPremium ? FREE_BATCH + PREMIUM_EXTRA : FREE_BATCH;

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
        ? ((await supabase.storage.from("photos").createSignedUrls(paths, 3600)).data ?? [])
        : [];
      return (data ?? []).map((p, i) => ({ ...p, url: signed[i]?.signedUrl ?? null }));
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error("Pick a photo first");
      for (const file of files.slice(0, maxBatch)) {
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
          location: place.trim() || null,
          taken_on: takenOn,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setFiles([]);
      setCaption("");
      setPlace("");
      if (fileRef.current) fileRef.current.value = "";
      void qc.invalidateQueries({ queryKey: ["photos"] });
      toast.success("Added to your memories");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout title="Memories" subtitle="Your shared gallery" critter="seal">
      <Card>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background py-6 text-sm font-bold text-muted-foreground"
          >
            <ImagePlus className="size-5" />
            {files.length === 0
              ? maxBatch > 1
                ? `Choose up to ${maxBatch} photos`
                : "Choose a photo"
              : `${files.length} photo${files.length > 1 ? "s" : ""} selected`}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple={maxBatch > 1}
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (picked.length > maxBatch) {
                toast.error(
                  isPremium
                    ? `You can upload ${maxBatch} at a time.`
                    : `Free spaces upload ${FREE_BATCH} at a time — Premium adds ${PREMIUM_EXTRA} more.`,
                );
              }
              setFiles(picked.slice(0, maxBatch));
            }}
          />
          <Field label="Caption">
            <TextInput
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              placeholder="That perfect afternoon"
            />
          </Field>
          <Field label="Where was this?">
            <TextInput
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              maxLength={120}
              placeholder="Kyoto, the little ramen place"
            />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} />
          </Field>
          <PrimaryButton disabled={files.length === 0 || upload.isPending} onClick={() => upload.mutate()}>
            {upload.isPending ? "Uploading…" : "Add to memories"}
          </PrimaryButton>
          {!isPremium ? (
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Sparkles className="size-3.5" />
              Premium unlocks {PREMIUM_EXTRA} extra photos per upload.
            </p>
          ) : null}
          <p className="text-center text-xs text-muted-foreground">
            Photos are resized before upload to keep things light.
          </p>
        </div>
      </Card>

      <SectionTitle>Gallery</SectionTitle>
      {!photos || photos.length === 0 ? (
        <Card className="text-sm text-muted-foreground">No memories yet.</Card>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(p as PhotoWithUrl)}
              className="press relative aspect-square overflow-hidden rounded-2xl bg-muted"
            >
              {p.url ? (
                <img
                  src={p.url}
                  alt={p.caption ?? "Shared memory"}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : null}
              {p.location ? (
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] font-bold text-white">
                  {p.location}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {open ? <PhotoDetail photo={open} onClose={() => setOpen(null)} /> : null}
    </AppLayout>
  );
}

function PhotoDetail({ photo, onClose }: { photo: PhotoWithUrl; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-lg px-4 py-4">
        <div className="flex justify-end">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="press grid size-10 place-items-center rounded-full bg-card shadow-soft"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="card-soft mt-2 overflow-hidden p-0">
          {photo.url ? (
            <img
              src={photo.url}
              alt={photo.caption ?? "Shared memory"}
              className="w-full object-cover"
            />
          ) : null}
          <div className="p-4">
            <p className="text-sm font-bold">{photo.caption ?? "Untitled"}</p>
            <p className="text-xs text-muted-foreground">{photo.taken_on}</p>
            {photo.location ? (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
                <MapPin className="size-3.5" />
                {photo.location}
              </p>
            ) : null}
            <PhotoComments photoId={photo.id} />
          </div>
        </div>
      </div>
    </div>
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
