import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Doodle } from "@/components/Doodles";
import { playChirp } from "@/hooks/use-sound";
import { useRefreshSession } from "@/lib/session";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — BLUBLUB" },
      { name: "description", content: "Choose a new password for your BLUBLUB account." },
      { property: "og:title", content: "Reset password — BLUBLUB" },
      { property: "og:description", content: "Choose a new password for your BLUBLUB account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const refresh = useRefreshSession();

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && active) setReady(true);
    });
    // Some flows deliver the session before we subscribe.
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      playChirp("success");
      setDone(true);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring";

  if (done) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
        <div className="card-soft max-w-sm p-7 text-center">
          <Doodle critter="cat" pose="love" size={72} className="mx-auto" />
          <h1 className="mt-3 text-2xl font-extrabold">Password updated</h1>
          <p className="mt-2 text-sm text-muted-foreground">You're all set — welcome back.</p>
          <button
            className="press mt-5 w-full rounded-full bg-primary px-5 py-3 text-base font-bold text-primary-foreground shadow-soft"
            onClick={() => navigate({ to: "/" })}
          >
            Go home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-start justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Doodle critter="penguin" pose="peek" size={84} className="mx-auto" />
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">New password</h1>
          <p className="text-sm text-muted-foreground">Choose a fresh password for your account</p>
        </div>

        {ready ? (
          <form onSubmit={submit} className="card-soft space-y-3 p-5">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                New password
              </span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Confirm password
              </span>
              <input
                name="confirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
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
              {busy ? "Saving…" : "Set new password"}
            </button>
          </form>
        ) : (
          <div className="card-soft p-6 text-center text-sm text-muted-foreground">
            <p className="font-bold text-foreground">This reset link isn't valid anymore</p>
            <p className="mt-1">
              Open the link from your email again, or request a fresh one from the sign-in screen.
            </p>
            <button
              className="press mt-4 text-sm font-bold text-primary"
              onClick={() => navigate({ to: "/auth" })}
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
