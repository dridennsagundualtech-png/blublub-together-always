import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const refresh = useRefreshSession();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
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
          setSent(true);
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

  if (sent) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5">
        <div className="card-soft max-w-sm p-7 text-center">
          <Doodle critter="penguin" pose="sleep" size={72} className="mx-auto" />
          <h1 className="mt-3 text-2xl font-extrabold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to {email}. Tap it, then come back and sign in.
          </p>
          <button
            className="press mt-5 text-sm font-bold text-primary"
            onClick={() => {
              setSent(false);
              setMode("signin");
            }}
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="relative mb-6 text-center">
          <Doodle critter="cat" pose="wave" size={84} className="mx-auto" />
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">BLUBLUB</h1>
          <p className="text-sm text-muted-foreground">Your cozy space for two</p>
          <Doodle critter="seal" pose="peek" size={44} className="absolute right-2 top-8 opacity-50" />

        </div>

        <form onSubmit={submit} className="card-soft space-y-3 p-5">
          {mode === "signup" ? (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Your name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Mimi"
                className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
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
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          >
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </main>
  );
}
