import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, MapPin, Palette, RotateCcw, SlidersHorizontal } from "lucide-react";
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
/*  FULL THEME EDITOR                                                  */
/* ------------------------------------------------------------------ */

const PALETTE = [
  { id: "blush", hex: "#FFAFCC", name: "Blush Pop" },
  { id: "petal", hex: "#FFC8DD", name: "Pastel Petal" },
  { id: "orchid", hex: "#CDB4DB", name: "Pink Orchid" },
  { id: "icy", hex: "#BDE0FE", name: "Icy Blue" },
  { id: "sky", hex: "#A2D2FF", name: "Sky Blue" },
] as const;

type ColorRole =
  | "primary"
  | "accent"
  | "lavender"
  | "sky"
  | "petal"
  | "icy"
  | "gradHeroFrom"
  | "gradHeroTo"
  | "gradFeaturedFrom"
  | "gradFeaturedTo"
  | "gradPanelFrom"
  | "gradPanelTo";

const COLOR_ROLES: { key: ColorRole; label: string; cssVar: string }[] = [
  { key: "primary", label: "Primary", cssVar: "--primary" },
  { key: "accent", label: "Accent", cssVar: "--accent" },
  { key: "lavender", label: "Lavender", cssVar: "--lavender" },
  { key: "sky", label: "Sky", cssVar: "--sky" },
  { key: "petal", label: "Soft Pink", cssVar: "--petal" },
  { key: "icy", label: "Icy", cssVar: "--icy" },
  { key: "gradHeroFrom", label: "Hero Grad From", cssVar: "--grad-hero-from" },
  { key: "gradHeroTo", label: "Hero Grad To", cssVar: "--grad-hero-to" },
  { key: "gradFeaturedFrom", label: "Featured Grad From", cssVar: "--grad-featured-from" },
  { key: "gradFeaturedTo", label: "Featured Grad To", cssVar: "--grad-featured-to" },
  { key: "gradPanelFrom", label: "Panel Grad From", cssVar: "--grad-panel-from" },
  { key: "gradPanelTo", label: "Panel Grad To", cssVar: "--grad-panel-to" },
];

const DEFAULT_COLORS: Record<ColorRole, string> = {
  primary: "#FFAFCC",
  accent: "#CDB4DB",
  lavender: "#CDB4DB",
  sky: "#A2D2FF",
  petal: "#FFC8DD",
  icy: "#BDE0FE",
  gradHeroFrom: "#FFAFCC",
  gradHeroTo: "#CDB4DB",
  gradFeaturedFrom: "#CDB4DB",
  gradFeaturedTo: "#FFAFCC",
  gradPanelFrom: "#2A1F3D",
  gradPanelTo: "#1A1528",
};

const DEFAULT_BOX = {
  radius: 1.25,          // rem
  cardRadius: 1.25,      // rem
  panelRadius: 1.75,     // rem
  shadowStrength: 0.28,  // 0–1
  heroAngle: 140,        // deg
  featuredAngle: 135,    // deg
  panelAngle: 180,       // deg
};

type ThemeState = {
  colors: Record<ColorRole, string>;
  box: typeof DEFAULT_BOX;
};

const STORAGE_KEY = "blublub-theme-v2";

function loadTheme(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        colors: { ...DEFAULT_COLORS, ...parsed.colors },
        box: { ...DEFAULT_BOX, ...parsed.box },
      };
    }
  } catch {}
  return { colors: { ...DEFAULT_COLORS }, box: { ...DEFAULT_BOX } };
}

function applyTheme(state: ThemeState) {
  const root = document.documentElement;
  const { colors, box } = state;

  // Colors
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--lavender", colors.lavender);
  root.style.setProperty("--sky", colors.sky);
  root.style.setProperty("--petal", colors.petal);
  root.style.setProperty("--peach", colors.petal);
  root.style.setProperty("--icy", colors.icy);
  root.style.setProperty("--ring", colors.primary);
  root.style.setProperty("--sidebar-primary", colors.primary);
  root.style.setProperty("--sidebar-accent", colors.accent);
  root.style.setProperty("--chart-1", colors.primary);
  root.style.setProperty("--chart-2", colors.lavender);
  root.style.setProperty("--chart-3", colors.sky);
  root.style.setProperty("--chart-4", colors.icy);
  root.style.setProperty("--chart-5", colors.petal);

  // Gradients
  root.style.setProperty("--grad-hero-from", colors.gradHeroFrom);
  root.style.setProperty("--grad-hero-to", colors.gradHeroTo);
  root.style.setProperty("--grad-featured-from", colors.gradFeaturedFrom);
  root.style.setProperty("--grad-featured-to", colors.gradFeaturedTo);
  root.style.setProperty("--grad-panel-from", colors.gradPanelFrom);
  root.style.setProperty("--grad-panel-to", colors.gradPanelTo);
  root.style.setProperty("--grad-hero-angle", `${box.heroAngle}deg`);
  root.style.setProperty("--grad-featured-angle", `${box.featuredAngle}deg`);
  root.style.setProperty("--grad-panel-angle", `${box.panelAngle}deg`);

  // Boxes / corners / shadows
  root.style.setProperty("--radius", `${box.radius}rem`);
  root.style.setProperty("--card-radius", `${box.cardRadius}rem`);
  root.style.setProperty("--panel-radius", `${box.panelRadius}rem`);
  root.style.setProperty("--shadow-strength", String(box.shadowStrength));
}

function ThemeEditor() {
  const [state, setState] = useState<ThemeState>(loadTheme);
  const [tab, setTab] = useState<"colors" | "gradients" | "boxes">("colors");
  const [activeRole, setActiveRole] = useState<ColorRole>("primary");

  useEffect(() => {
    applyTheme(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  function setColor(role: ColorRole, hex: string) {
    setState((s) => ({
      ...s,
      colors: { ...s.colors, [role]: hex },
    }));
  }

  function setBox<K extends keyof typeof DEFAULT_BOX>(key: K, value: number) {
    setState((s) => ({
      ...s,
      box: { ...s.box, [key]: value },
    }));
  }

  function resetAll() {
    const fresh = { colors: { ...DEFAULT_COLORS }, box: { ...DEFAULT_BOX } };
    setState(fresh);
    toast.success("Theme reset to defaults");
  }

  const colorRolesForTab =
    tab === "colors"
      ? COLOR_ROLES.filter((r) => !r.key.startsWith("grad"))
      : tab === "gradients"
        ? COLOR_ROLES.filter((r) => r.key.startsWith("grad"))
        : [];

  return (
    <Card className="mt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          <p className="text-sm font-bold">Full Theme Editor</p>
        </div>
        <button
          type="button"
          onClick={resetAll}
          className="press flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Every corner, color, gradient and shadow is editable. Changes apply live and stay on this device.
      </p>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-full bg-muted p-1">
        {(
          [
            { id: "colors", label: "Colors" },
            { id: "gradients", label: "Gradients" },
            { id: "boxes", label: "Boxes & Corners" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`press flex-1 rounded-full py-1.5 text-xs font-bold transition-colors ${
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* COLORS / GRADIENTS */}
      {(tab === "colors" || tab === "gradients") && (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {colorRolesForTab.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setActiveRole(r.key)}
                className={`press rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  activeRole === r.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center gap-3">
            <span
              className="size-11 shrink-0 rounded-2xl border-2 border-border shadow-soft"
              style={{ backgroundColor: state.colors[activeRole] }}
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {COLOR_ROLES.find((r) => r.key === activeRole)?.label}
              </p>
              <p className="font-mono text-sm font-bold">{state.colors[activeRole]}</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {PALETTE.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(activeRole, c.hex)}
                className="press flex flex-col items-center gap-1"
                title={c.name}
              >
                <span
                  className={`size-11 rounded-2xl border-2 shadow-soft transition-transform ${
                    state.colors[activeRole] === c.hex
                      ? "scale-110 border-foreground"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
                <span className="text-[9px] font-semibold leading-tight text-muted-foreground">
                  {c.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>

          {/* Extra dark tones for panel gradients */}
          {tab === "gradients" && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {["#2A1F3D", "#1A1528", "#3D2A4A", "#1F2757"].map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(activeRole, hex)}
                  className="press flex flex-col items-center gap-1"
                >
                  <span
                    className={`size-10 rounded-xl border-2 ${
                      state.colors[activeRole] === hex ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                  <span className="font-mono text-[8px] text-muted-foreground">{hex.slice(1, 5)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* BOXES & CORNERS */}
      {tab === "boxes" && (
        <div className="space-y-4">
          <SliderRow
            label="Global radius"
            value={state.box.radius}
            min={0.5}
            max={2.5}
            step={0.05}
            unit="rem"
            onChange={(v) => setBox("radius", v)}
          />
          <SliderRow
            label="Card / tile radius"
            value={state.box.cardRadius}
            min={0.5}
            max={2.5}
            step={0.05}
            unit="rem"
            onChange={(v) => setBox("cardRadius", v)}
          />
          <SliderRow
            label="Big panel radius"
            value={state.box.panelRadius}
            min={0.75}
            max={3}
            step={0.05}
            unit="rem"
            onChange={(v) => setBox("panelRadius", v)}
          />
          <SliderRow
            label="Shadow strength"
            value={state.box.shadowStrength}
            min={0}
            max={0.6}
            step={0.02}
            unit=""
            onChange={(v) => setBox("shadowStrength", v)}
          />
          <SliderRow
            label="Hero gradient angle"
            value={state.box.heroAngle}
            min={0}
            max={360}
            step={5}
            unit="°"
            onChange={(v) => setBox("heroAngle", v)}
          />
          <SliderRow
            label="Featured gradient angle"
            value={state.box.featuredAngle}
            min={0}
            max={360}
            step={5}
            unit="°"
            onChange={(v) => setBox("featuredAngle", v)}
          />
          <SliderRow
            label="Panel gradient angle"
            value={state.box.panelAngle}
            min={0}
            max={360}
            step={5}
            unit="°"
            onChange={(v) => setBox("panelAngle", v)}
          />

          {/* Live preview boxes */}
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div
              className="h-16 bg-primary/20"
              style={{ borderRadius: `${state.box.cardRadius}rem` }}
            />
            <div
              className="h-16"
              style={{
                borderRadius: `${state.box.panelRadius}rem`,
                background: `linear-gradient(${state.box.panelAngle}deg, ${state.colors.gradPanelFrom}, ${state.colors.gradPanelTo})`,
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">{label}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {value.toFixed(unit === "°" || unit === "" ? 0 : 2)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </div>
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
      <ThemeEditor />

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
