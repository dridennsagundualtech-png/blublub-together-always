import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, GhostButton, PrimaryButton, SectionTitle, TextInput } from "@/components/ui-kit";
import { Doodle } from "@/components/Doodles";
import { compressImage } from "@/lib/image";
import { useAuthUser, useCouple, usePartner, useProfile, useRefreshSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — BLUBLUB" },
      { name: "description", content: "Your name, photo, anniversary and premium redeem code." },
      { property: "og:title", content: "Profile & Settings — BLUBLUB" },
      {
        property: "og:description",
        content: "Your name, photo, anniversary and premium redeem code.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const { data: couple } = useCouple();
  const partner = usePartner();
  const refresh = useRefreshSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.display_name ?? "");
  const [anniversary, setAnniversary] = useState(profile?.anniversary_date ?? "");
  const [code, setCode] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Sync local edit state once the profile loads.
  if (profile && name === "" && profile.display_name) setName(profile.display_name);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name.trim(), anniversary_date: anniversary || null })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const blob = await compressImage(file, 512);
      const path = `${user!.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user!.id);
      if (error) throw error;
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      setAvatarUrl(data?.signedUrl ?? null);
    },
    onSuccess: () => {
      refresh();
      toast.success("Photo updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const redeem = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("redeem_premium", { _code: code.trim() });
      if (error) throw error;
      if (!data) throw new Error("That code didn't work");
    },
    onSuccess: () => {
      setCode("");
      refresh();
      toast.success("Premium unlocked ✨");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <AppLayout title="Profile" subtitle="You & your space" critter="cat">
      <Card>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="press grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-muted"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Your avatar" className="size-full object-cover" />
            ) : (
              <Doodle critter="seal" pose="wave" size={56} />
            )}
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold">{profile?.display_name ?? "Add your name"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">Tap the photo to change it</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadAvatar.mutate(f);
          }}
        />
      </Card>

      <Card className="mt-4">
        <div className="space-y-3">
          <Field label="Display name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Relationship anniversary">
            <TextInput
              type="date"
              value={anniversary}
              onChange={(e) => setAnniversary(e.target.value)}
            />
          </Field>
          <PrimaryButton disabled={save.isPending} onClick={() => save.mutate()}>
            Save
          </PrimaryButton>
        </div>
      </Card>

      <SectionTitle>Your couple space</SectionTitle>
      <Card>
        <p className="text-sm">
          Invite code:{" "}
          <span className="font-mono text-lg font-extrabold tracking-widest text-primary">
            {couple?.invite_code ?? "—"}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {partner ? `Paired with ${partner.display_name ?? "your partner"} 🩷` : "Waiting for your partner to join."}
        </p>
      </Card>

      <SectionTitle>Redeem a code</SectionTitle>
      <Card>
        <div className="flex gap-2">
          <TextInput
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code"
            maxLength={40}
          />
          <PrimaryButton
            className="w-auto px-5"
            disabled={!code.trim() || redeem.isPending}
            onClick={() => redeem.mutate()}
          >
            Redeem
          </PrimaryButton>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {profile?.is_premium ? "Premium is active on your account ✨" : "Unlocks premium areas."}
        </p>
      </Card>

      <div className="mt-6 flex justify-center">
        <GhostButton onClick={() => void signOut()}>Sign out</GhostButton>
      </div>
    </AppLayout>
  );
}
