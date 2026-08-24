import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, GhostButton, PrimaryButton, SectionTitle, TextInput } from "@/components/ui-kit";
import { Doodle } from "@/components/Doodles";
import { SignInPanel } from "@/components/SignInPanel";
import { compressImage } from "@/lib/image";
import { useIsAdmin } from "@/lib/admin";
import { clearMyLocation } from "@/lib/location";
import { askNotificationPermission, canNotify } from "@/lib/reminders";
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
  const navigate = useNavigate();
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const { data: couple } = useCouple();
  const partner = usePartner();
  const refresh = useRefreshSession();
  const { data: isAdmin } = useIsAdmin();

  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.display_name ?? "");
  const [anniversary, setAnniversary] = useState(profile?.anniversary_date ?? "");
  const [birthday, setBirthday] = useState(profile?.birthday ?? "");
  const [code, setCode] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Sync local edit state once the profile loads.
  if (profile && name === "" && profile.display_name) setName(profile.display_name);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim(),
          anniversary_date: anniversary || null,
          birthday: birthday || null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLocation = useMutation({
    mutationFn: async (next: boolean) => {
      if (next && typeof navigator !== "undefined" && navigator.geolocation) {
        await new Promise<void>((resolve) =>
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            () => resolve(),
            { timeout: 10_000 },
          ),
        );
      }
      const { error } = await supabase
        .from("profiles")
        .update({ share_location: next })
        .eq("id", user!.id);
      if (error) throw error;
      if (!next) await clearMyLocation(user!.id);
    },
    onSuccess: () => refresh(),
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
    await navigate({ to: "/", replace: true });
  }

  if (!user) {
    return (
      <AppLayout title="Profile" subtitle="Sign in to your space" critter="cat" requireCouple={false}>
        <p className="mb-3 px-1 text-sm text-muted-foreground">
          Sign in or create an account to load your couple space.
        </p>
        <SignInPanel />
      </AppLayout>
    );
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
          <Field label="Your birthday">
            <TextInput
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </Field>

          <PrimaryButton disabled={save.isPending} onClick={() => save.mutate()}>
            Save
          </PrimaryButton>
        </div>
      </Card>

      <SectionTitle>Privacy</SectionTitle>
      <Card>
        <div className="flex items-center gap-3">
          <MapPin className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Share my location</p>
            <p className="text-xs text-muted-foreground">
              Only you control this. Off by default; your partner sees you only while it&apos;s on.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!profile?.share_location}
            aria-label="Share my location"
            disabled={toggleLocation.isPending}
            onClick={() => toggleLocation.mutate(!profile?.share_location)}
            className={`press h-7 w-12 shrink-0 rounded-full transition-colors ${
              profile?.share_location ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`block size-6 rounded-full bg-card shadow-soft transition-transform ${
                profile?.share_location ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </Card>

      <Card className="mt-3">
        <div className="flex items-center gap-3">
          <Bell className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Anniversary reminders</p>
            <p className="text-xs text-muted-foreground">
              Get a nudge 30, 7, 3 and 1 days before — and on the day itself.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void askNotificationPermission().then((r) =>
                toast[r === "granted" ? "success" : "message"](
                  r === "granted" ? "Reminders on 🩷" : "Notifications are blocked in your browser",
                ),
              );
            }}
            className="press shrink-0 rounded-full bg-accent px-3 py-2 text-xs font-bold text-accent-foreground"
          >
            {canNotify() && typeof Notification !== "undefined" && Notification.permission === "granted"
              ? "Enabled"
              : "Enable"}
          </button>
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
          {profile?.is_premium
            ? "Premium is active on your account ✨"
            : "Codes are single-use and expire."}
        </p>
      </Card>

      {isAdmin ? (
        <div className="mt-4 flex justify-center">
          <Link to="/admin-codes" className="press text-xs font-semibold text-muted-foreground underline">
            Code generator
          </Link>
        </div>
      ) : null}


      <div className="mt-6 flex justify-center">
        <GhostButton onClick={() => void signOut()}>Sign out</GhostButton>
      </div>
    </AppLayout>
  );
}
