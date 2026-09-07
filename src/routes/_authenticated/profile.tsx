import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, MapPin, Palette, RotateCcw } from "lucide-react";
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

/* ------------------------------------------------------------------ */
/*  SIMPLE VISUAL THEME EDITOR                                         */
/* ------------------------------------------------------------------ */

const COLORS = [
  { id: "blush", hex: "#FFAFCC", label: "Blush", emoji: "💗" },
  { id: "petal", hex: "#FFC8DD", label: "Petal", emoji: "🌸" },
  { id: "orchid", hex: "#CDB4DB", label: "Orchid", emoji: "💜" },
  { id: "icy", hex: "#BDE0FE", label: "Icy", emoji: "❄️" },
  { id: "sky", hex: "#A2D2FF", label: "Sky", emoji: "☁️" },
] as const;

type Slot = "main" | "soft" | "purple" | "blue";

const SLOTS: { id: Slot; title: string; hint: string }[] = [
  { id: "main", title: "Main color", hint: "Buttons & highlights" },
  { id: "soft", title: "Soft color", hint: "Gentle cards" },
  { id: "purple", title: "Purple color", hint: "Accents & tiles" },
  { id: "blue", title: "Blue color", hint: "Calm tiles & sky" },
];

const DEFAULTS: Record<Slot, string> = {
  main: "#FFAFCC",
  soft: "#FFC8DD",
  purple: "#CDB4DB",
  blue: "#A2D2FF",
};

const STORAGE_KEY = "blublub-theme-v2";

function applyColors(map: Record<Slot, string>) {
  const root = document.documentElement;
  root.style.setProperty("--primary", map.main);
  root.style.setProperty("--ring", map.main);
  root.style.setProperty("--sidebar-primary", map.main);
  root.style.setProperty("--chart-1", map.main);

  root.style.setProperty("--petal", map.soft);
  root.style.setProperty("--peach", map.soft);
  root.style.setProperty("--secondary", map.soft);
  root.style.setProperty("--chart-5", map.soft);

  root.style.setProperty("--accent", map.purple);
  root.style.setProperty("--lavender", map.purple);
  root.style.setProperty("--sidebar-accent", map.purple);
  root.style.setProperty("--chart-2", map.purple);
  root.style.setProperty("--grad-featured-from", map.purple);
  root.style.setProperty("--grad-featured-to", map.main);
  root.style.setProperty("--grad-hero-from", map.main);
  root.style.setProperty("--grad-hero-to", map.purple);

  root.style.setProperty("--sky", map.blue);
  root.style.setProperty("--icy", map.blue === "#A2D2FF" ? "#BDE0FE" : map.blue);
  root.style.setProperty("--chart-3", map.blue);
  root.style.setProperty("--chart-4", map.blue === "#A2D2FF" ? "#BDE0FE" : map.blue);
}

function loadColors(): Record<Slot, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // support both old and new shape
      if (parsed.colors) {
        return {
          main: parsed.colors.primary ?? DEFAULTS.main,
          soft: parsed.colors.petal ?? DEFAULTS.soft,
          purple: parsed.colors.lavender ?? DEFAULTS.purple,
          blue: parsed.colors.sky ?? DEFAULTS.blue,
        };
      }
      if (parsed.main) return { ...DEFAULTS, ...parsed };
    }
  } catch {}
  return { ...DEFAULTS };
}

function SimpleThemeEditor() {
  const [map, setMap] = useState<Record<Slot, string>>(loadColors);
  const [active, setActive] = useState<Slot>("main");

  useEffect(() => {
    applyColors(map);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }, [map]);

  useEffect(() => {
    applyColors(loadColors());
  }, []);

  function pick(hex: string) {
    setMap((m) => ({ ...m, [active]: hex }));
  }

  function reset() {
    setMap({ ...DEFAULTS });
    toast.success("Colors reset ✨");
  }

  return (
    <Card className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          <p className="text-sm font-bold">App colors</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="press flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>

      {/* Live mini preview illustration */}
      <div className="mb-4 overflow-hidden rounded-[1.25rem] border border-border bg-background p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Live preview
        </p>
        <div className="flex gap-2">
          {/* mini button */}
          <div
            className="flex h-10 flex-1 items-center justify-center rounded-full text-xs font-bold shadow-soft"
            style={{ backgroundColor: map.main, color: "#3F2A3A" }}
          >
            Button
          </div>
          {/* mini soft card */}
          <div
            className="flex h-10 flex-1 items-center justify-center rounded-2xl text-xs font-bold"
            style={{ backgroundColor: map.soft, color: "#3F2A3A" }}
          >
            Soft card
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <div
            className="flex h-14 flex-1 flex-col justify-between rounded-2xl p-2"
            style={{ backgroundColor: map.purple, color: "#3F2A3A" }}
          >
            <span className="text-[9px] font-bold opacity-70">Tile</span>
            <span className="text-xs font-bold">Purple</span>
          </div>
          <div
            className="flex h-14 flex-1 flex-col justify-between rounded-2xl p-2"
            style={{ backgroundColor: map.blue, color: "#3F2A3A" }}
          >
            <span className="text-[9px] font-bold opacity-70">Tile</span>
            <span className="text-xs font-bold">Blue</span>
          </div>
        </div>
        {/* mini featured gradient */}
        <div
          className="mt-2 flex h-12 items-center justify-between rounded-2xl px-3"
          style={{
            background: `linear-gradient(135deg, ${map.purple}, ${map.main})`,
            color: "#3F2A3A",
          }}
        >
          <span className="text-xs font-bold">Featured card</span>
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold">
            Open
          </span>
        </div>
      </div>

      {/* Slot picker */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {SLOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={`press flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition-colors ${
              active === s.id ? "border-foreground bg-muted" : "border-transparent bg-muted/50"
            }`}
          >
            <span
              className="size-8 shrink-0 rounded-xl shadow-soft"
              style={{ backgroundColor: map[s.id] }}
            />
            <span>
              <span className="block text-xs font-bold">{s.title}</span>
              <span className="block text-[10px] text-muted-foreground">{s.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Tap a color for “{SLOTS.find((s) => s.id === active)?.title}”
      </p>

      {/* Big color swatches */}
      <div className="grid grid-cols-5 gap-2">
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => pick(c.hex)}
            className="press flex flex-col items-center gap-1"
          >
            <span
              className={`grid size-12 place-items-center rounded-2xl text-lg shadow-soft transition-transform ${
                map[active] === c.hex ? "scale-110 ring-2 ring-foreground ring-offset-2" : ""
              }`}
              style={{ backgroundColor: c.hex }}
            >
              {c.emoji}
            </span>
            <span className="text-[9px] font-semibold text-muted-foreground">{c.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

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

      <SectionTitle>Appearance</SectionTitle>
      <SimpleThemeEditor />

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
