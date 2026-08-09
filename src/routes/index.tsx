import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Doodle } from "@/components/Doodles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BLUBLUB — Your private couples space" },
      {
        name: "description",
        content:
          "BLUBLUB is a cozy private app for two: shared calendar, photo timeline, diary, budget and chat.",
      },
      { property: "og:title", content: "BLUBLUB — Your private couples space" },
      {
        property: "og:description",
        content: "A cozy private app for two: calendar, memories, diary, budget and chat.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <AppLayout title="BLUBLUB" subtitle="Your cozy space for two" critter="cat">
      <section className="card-soft relative overflow-hidden p-6 text-center">
        <Doodle critter="penguin" size={48} className="absolute -left-1 bottom-1 opacity-40" />
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Days together
        </p>
        <p className="mt-1 text-5xl font-extrabold text-primary">—</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in and pair with your partner to start counting.
        </p>
      </section>

      <section className="card-soft mt-4 p-5">
        <h2 className="text-lg font-bold">Backend not connected yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect the external Supabase project (blublub) and I&apos;ll wire up accounts, pairing
          and every feature below to it.
        </p>
      </section>
    </AppLayout>
  );
}
