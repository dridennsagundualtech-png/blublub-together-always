import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, MapPin, Palette, RotateCcw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, GhostButton, PrimaryButton, SectionTitle, TextInput } from "@/components/ui-kit";
import { Doodle } from "@/components/Doodles";
import { SignInPanel } from "@/components/SignInPanel";
import { compressImage } from "@/lib/image";
import { useIsAdmin } from "@/lib/admin";
import { clearMyLocation } from "@/lib/location";
import { askNotificationPermission, canNotify } from "@/lib/reminders";
import { useAuthUser, useCouple, useCoupleId, usePartner, useProfile, useRefreshSession } from "@/lib/session";

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
/*  SHARED COUPLE THEME EDITOR (colors + gradients)                    */
/* ------------------------------------------------------------------ */

const COLORS = [
  // original palette
  { id: "blush", hex: "#FFAFCC", label: "Blush", emoji: "💗" },
  { id: "petal", hex: "#FFC8DD", label: "Petal", emoji: "🌸" },
  { id: "orchid", hex: "#CDB4DB", label: "Orchid", emoji: "💜" },
  { id: "icy", hex: "#BDE0FE", label: "Icy", emoji: "❄️" },
  { id: "sky", hex: "#A2D2FF", label: "Sky", emoji: "☁️" },
  // new palette from your image
  { id: "alabaster", hex: "#D8E2DC", label: "Alabaster", emoji: "🤍" },
  { id: "powder", hex: "#FFE5D9", label: "Powder", emoji: "🍑" },
  { id: "pastel", hex: "#FFCAD4", label: "Pastel", emoji: "🎀" },
  { id: "cherry", hex: "#F4ACB7", label: "Cherry", emoji: "🍒" },
  { id: "mauve", hex: "#9D8189", label: "Mauve", emoji: "🥀" },
] as const;

type Slot = "main" | "soft" | "purple" | "blue" | "gradFrom" | "gradTo";

type ThemeMap = {
  main: string;
  soft: string;
  purple: string;
  blue: string;
  gradFrom: string;
  gradTo: string;
};

const SLOTS: { id: Slot; title: string; hint: string }[] = [
  { id: "main", title: "Main color", hint: "Buttons & highlights" },
  { id: "soft", title: "Soft color", hint: "Gentle cards" },
  { id: "purple", title: "Purple color", hint: "Accents & tiles" },
  { id: "blue", title: "Blue color", hint: "Calm tiles & sky" },
  { id: "gradFrom", title: "Gradient start", hint: "Featured cards start" },
  { id: "gradTo", title: "Gradient end", hint: "Featured cards end" },
];

const DEFAULTS: ThemeMap = {
  main: "#FFAFCC",
  soft: "#FFC8DD",
  purple: "#CDB4DB",
  blue: "#A2D2FF",
  gradFrom: "#CDB4DB",
  gradTo: "#FFAFCC",
};

const STORAGE_KEY = "blublub-theme-v2";

export function applyColors(map: ThemeMap) {
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

  root.style.setProperty("--sky", map.blue);
  root.style.setProperty("--icy", map.blue === "#A2D2FF" ? "#BDE0FE" : map.blue);
  root.style.setProperty("--chart-3", map.blue);
  root.style.setProperty("--chart-4", map.blue === "#A2D2FF" ? "#BDE0FE" : map.blue);

  // Gradients
  root.style.setProperty("--grad-featured-from", map.gradFrom);
  root.style.setProperty("--grad-featured-to", map.gradTo);
  root.style.setProperty("--grad-hero-from", map.gradFrom);
  root.style.setProperty("--grad-hero-to", map.gradTo);
  root.style.setProperty("--grad-panel-from", map.gradFrom);
  root.style.setProperty("--grad-panel-to", map.gradTo);
}

function normalizeTheme(raw: unknown): ThemeMap {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  const o = raw as Record<string, string>;
  if (o.main) {
    return {
      main: o.main || DEFAULTS.main,
      soft: o.soft || DEFAULTS.soft,
      purple: o.purple || DEFAULTS.purple,
      blue: o.blue || DEFAULTS.blue,
      gradFrom: o.gradFrom || o.purple || DEFAULTS.gradFrom,
      gradTo: o.gradTo || o.main || DEFAULTS.gradTo,
    };
  }
  const c = (raw as { colors?: Record<string, string> }).colors;
  if (c) {
    return {
      main: c.primary || DEFAULTS.main,
      soft: c.petal || DEFAULTS.soft,
      purple: c.lavender || DEFAULTS.purple,
      blue: c.sky || DEFAULTS.blue,
      gradFrom: c.lavender || DEFAULTS.gradFrom,
      gradTo: c.primary || DEFAULTS.gradTo,
    };
  }
  return { ...DEFAULTS };
}

function SimpleThemeEditor() {
  const coupleId = useCoupleId();
  const { data: couple } = useCouple();
  const qc = useQueryClient();
  const [map, setMap] = useState<ThemeMap>(DEFAULTS);
  const [active, setActive] = useState<Slot>("main");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const fromCouple = (couple as { theme?: unknown } | null | undefined)?.theme;
    if (fromCouple) {
      const next = normalizeTheme(fromCouple);
      setMap(next);
      applyColors(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setLoaded(true);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const next = normalizeTheme(JSON.parse(raw));
        setMap(next);
        applyColors(next);
      }
    } catch {}
    setLoaded(true);
  }, [couple, loaded]);

  useEffect(() => {
    if (!loaded) return;
    applyColors(map);
  }, [map, loaded]);

  async function saveShared(next: ThemeMap) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    applyColors(next);

    if (!coupleId) {
      toast.message("Pair with your partner to share colors");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("couples")
        .update({ theme: next } as never)
        .eq("id", coupleId);
      if (error) throw error;
      void qc.invalidateQueries({ queryKey: ["couple", coupleId] });
      toast.success("Colors shared with both of you 🩷");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("theme") || msg.includes("column")) {
        toast.error("Run the theme SQL migration in Supabase first");
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  function pick(hex: string) {
    setMap((m) => ({ ...m, [active]: hex }));
  }

  function reset() {
    setMap({ ...DEFAULTS });
    void saveShared({ ...DEFAULTS });
  }

  return (
    <Card className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          <p className="text-sm font-bold">Our app colors</p>
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

      <div className="mb-3 flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2">
        <Users className="size-4 shrink-0 text-primary" />
        <p className="text-[11px] font-semibold leading-snug text-foreground">
          Shared with both of you — pick colors & gradients together.
        </p>
      </div>

      {/* Live mini preview */}
      <div className="mb-4 overflow-hidden rounded-[1.25rem] border border-border bg-background p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Live preview
        </p>
        <div className="flex gap-2">
          <div
            className="flex h-10 flex-1 items-center justify-center rounded-full text-xs font-bold shadow-soft"
            style={{ backgroundColor: map.main, color: "#3F2A3A" }}
          >
            Button
          </div>
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
            <span className="text-xs font-bold">Accent</span>
          </div>
          <div
            className="flex h-14 flex-1 flex-col justify-between rounded-2xl p-2"
            style={{ backgroundColor: map.blue, color: "#3F2A3A" }}
          >
            <span className="text-[9px] font-bold opacity-70">Tile</span>
            <span className="text-xs font-bold">Calm</span>
          </div>
        </div>
        {/* Gradient illustration */}
        <div
          className="mt-2 flex h-14 items-center justify-between rounded-2xl px-3"
          style={{
            background: `linear-gradient(135deg, ${map.gradFrom}, ${map.gradTo})`,
            color: "#3F2A3A",
          }}
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">Gradient</p>
            <p className="text-xs font-bold">Featured card</p>
          </div>
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold">
            Open
          </span>
        </div>
      </div>

      {/* Slot picker — solid colors */}
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Solid colors
      </p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {SLOTS.filter((s) => s.id !== "gradFrom" && s.id !== "gradTo").map((s) => (
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

      {/* Gradient slots */}
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Gradient
      </p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {SLOTS.filter((s) => s.id === "gradFrom" || s.id === "gradTo").map((s) => (
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

      {/* Mini gradient bar for the active gradient pair */}
      <div
        className="mb-3 h-8 w-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${map.gradFrom}, ${map.gradTo})`,
        }}
      />

      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Tap a color for “{SLOTS.find((s) => s.id === active)?.title}”
      </p>

      {/* Color swatches — 2 rows of 5 */}
      <div className="grid grid-cols-5 gap-2">
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => pick(c.hex)}
            className="press flex flex-col items-center gap-1"
          >
            <span
              className={`grid size-11 place-items-center rounded-2xl text-base shadow-soft transition-transform ${
                map[active] === c.hex ? "scale-110 ring-2 ring-foreground ring-offset-2" : ""
              }`}
              style={{ backgroundColor: c.hex }}
            >
              {c.emoji}
            </span>
            <span className="text-[8px] font-semibold leading-tight text-muted-foreground">
              {c.label}
            </span>
          </button>
        ))}
      </div>

      <PrimaryButton
        className="mt-4"
        disabled={saving}
        onClick={() => void saveShared(map)}
      >
        {saving ? "Saving…" : "Save for both of us"}
      </PrimaryButton>
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
