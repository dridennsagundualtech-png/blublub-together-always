import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, Map as MapIcon, MapPin, Palette, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, GhostButton, PrimaryButton, SectionTitle, TextInput } from "@/components/ui-kit";
import { Doodle } from "@/components/Doodles";
import { SignInPanel } from "@/components/SignInPanel";
import { compressImage } from "@/lib/image";
import { useIsAdmin } from "@/lib/admin";
import { clearMyLocation } from "@/lib/location";
import { useMapSettings, type MapKind } from "@/lib/map-settings";
import { askNotificationPermission, canNotify } from "@/lib/reminders";
import { forgetAllSignedUrls, forgetSignedUrl, signedUrl } from "@/lib/signed-urls";
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


/* ------------------------------------------------------------------ */
/*  PROFILE PAGE                                                       */
/* ------------------------------------------------------------------ */

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
      forgetSignedUrl("avatars", path); // same path, new picture: needs a new link
      setAvatarUrl(await signedUrl("avatars", path));
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
    forgetAllSignedUrls();
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

      <SectionTitle>Appearance</SectionTitle>
      <Link to="/appearance" className="card-soft press flex items-center gap-3 p-4">
        <span className="grid size-11 place-items-center rounded-2xl tile-lilac text-primary">
          <Palette className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Colors & gradients</span>
          <span className="block text-xs text-muted-foreground">
            Pick our palette and which screens use gradient boxes
          </span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>


      <MapSettingsCard />

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
        <div className="mt-4 flex justify-center gap-4">
          <Link to="/admin-codes" className="press text-xs font-semibold text-muted-foreground underline">
            Code generator
          </Link>
          <Link to="/admin-users" className="press text-xs font-semibold text-muted-foreground underline">
            Member access
          </Link>
        </div>
      ) : null}

      <div className="mt-6 flex justify-center">
        <GhostButton onClick={() => void signOut()}>Sign out</GhostButton>
      </div>
    </AppLayout>
  );
}

const MAPS: { id: MapKind; label: string; note: string }[] = [
  { id: "classic", label: "Classic map", note: "The simple map you know" },
  { id: "3d", label: "3D map", note: "3D buildings, satellite, street photos" },
];

/** Which map "Where we are" uses, and the free keys for its extras. Saved on this phone. */
function MapSettingsCard() {
  const [map, setMap] = useMapSettings();
  return (
    <>
      <SectionTitle>Map</SectionTitle>
      <Card>
        <div className="flex items-start gap-3">
          <MapIcon className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            Choose the map for Where we are. This is saved on this phone only.
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Map">
          {MAPS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={map.kind === m.id}
              onClick={() => setMap({ kind: m.id })}
              className={`press rounded-2xl border-2 p-3 text-left ${
                map.kind === m.id ? "border-primary bg-primary/10" : "border-border bg-card"
              }`}
            >
              <span className="block text-sm font-bold">{m.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                {m.note}
              </span>
            </button>
          ))}
        </div>
        {map.kind === "3d" ? (
          <div className="mt-4 space-y-3">
            <Field label="Street photos key (Mapillary, free)">
              <TextInput
                value={map.mapillaryToken}
                onChange={(e) => setMap({ mapillaryToken: e.target.value })}
                placeholder="MLY|…"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Make a free account at mapillary.com, open Developers, register an app, and paste its
              Client Token here. Without it, street photos stay off. Not every street has photos.
            </p>
            <Field label="Sharper satellite key (ArcGIS, free, optional)">
              <TextInput
                value={map.arcgisKey}
                onChange={(e) => setMap({ arcgisKey: e.target.value })}
                placeholder="AAPK…"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Without a key, satellite photos come from Sentinel-2: clear for cities and nature,
              blurry up close. For street-level detail, make a free ArcGIS Location Platform
              account, create an API key with &quot;Static basemap tiles&quot;, and paste it here
              (2 million free map tiles a month).
            </p>
          </div>
        ) : null}
      </Card>
    </>
  );
}
