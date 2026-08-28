import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Doodle } from "@/components/Doodles";
import { playChirp } from "@/hooks/use-sound";
import { useRefreshSession } from "@/lib/session";

/** Inline sign in / sign up form, used inside Profile & Settings. */
export function SignInPanel() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const refresh = useRefreshSession();


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
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
          setSent(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      playChirp("success");
      refresh();
      toast.success("You're in 🩷");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card-soft p-6 text-center">
        <Doodle critter="penguin" pose="sleep" size={64} className="mx-auto" />
        <h2 className="mt-3 text-xl font-extrabold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to {email}. Tap it, then come back and sign in.
        </p>
        <button
          className="press mt-4 text-sm font-bold text-primary"
          onClick={() => {
            setSent(false);
            setMode("signin");
          }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div>
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

      <p className="mt-3 text-center text-sm text-muted-foreground">
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
  );
}
