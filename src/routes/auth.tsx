import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Doodle } from "@/components/Doodles";
import { playChirp } from "@/hooks/use-sound";
import { useRefreshSession } from "@/lib/session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — BLUBLUB" },
      { name: "description", content: "Sign in or create your BLUBLUB account for two." },
      { property: "og:title", content: "Sign in — BLUBLUB" },
      { property: "og:description", content: "Sign in or create your BLUBLUB account for two." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const refresh = useRefreshSession();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Uncontrolled inputs: read values only on submit. Android WebView IMEs drop
    // characters when React re-writes the input `value` mid-composition.
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        playChirp("success");
        setResetSentTo(email);
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentTo(email);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      playChirp("success");
      refresh();
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
        <div className="card-soft max-w-sm p-7 text-center">
          <Doodle critter="penguin" pose="sleep" size={72} className="mx-auto" />
          <h1 className="mt-3 text-2xl font-extrabold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to {sentTo}. Tap it, then come back and sign in.
          </p>
          <button
            className="press mt-5 text-sm font-bold text-primary"
            onClick={() => {
              setSentTo(null);
              setMode("signin");
            }}
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  if (resetSentTo) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
        <div className="card-soft max-w-sm p-7 text-center">
          <Doodle critter="seal" pose="sleep" size={72} className="mx-auto" />
          <h1 className="mt-3 text-2xl font-extrabold">Reset link sent</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a password reset link to {resetSentTo}. Tap it to choose a new password.
          </p>
          <button
            className="press mt-5 text-sm font-bold text-primary"
            onClick={() => {
              setResetSentTo(null);
              setMode("signin");
            }}
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring";

  return (
    <main className="flex min-h-[100dvh] items-start justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="relative mb-6 text-center">
          <Doodle critter="cat" pose="wave" size={84} className="mx-auto" />
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">BLUBLUB</h1>
          <p className="text-sm text-muted-foreground">Your cozy space for two</p>
          <Doodle critter="seal" pose="peek" size={44} className="absolute right-2 top-8 opacity-50" />
        </div>

        <form ref={formRef} onSubmit={submit} className="card-soft space-y-3 p-5">
          {mode === "signup" ? (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Your name
              </span>
              <input
                name="name"
                maxLength={60}
                placeholder="Mimi"
                autoCapitalize="words"
                autoComplete="name"
                enterKeyHint="next"
                className={inputClass}
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Password
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              className={inputClass}
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="press w-full rounded-full bg-primary px-5 py-3.5 text-base font-bold text-primary-foreground shadow-soft disabled:opacity-60"
          >
            {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            className="font-bold text-primary"
            onClick={() => {
              formRef.current?.reset();
              setMode(mode === "signup" ? "signin" : "signup");
            }}
          >
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </main>
  );
}
