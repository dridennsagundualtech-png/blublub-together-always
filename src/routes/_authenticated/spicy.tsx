import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Dices } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PremiumGate } from "@/components/PremiumGate";
import { Card, GhostButton, PrimaryButton } from "@/components/ui-kit";
import { Doodle } from "@/components/Doodles";
import { playChirp } from "@/hooks/use-sound";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useProfile, useRefreshSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/spicy")({
  head: () => ({
    meta: [
      { title: "18+ Dice — BLUBLUB" },
      { name: "description", content: "A premium, adults-only dice roll for paired partners." },
      { property: "og:title", content: "18+ Dice — BLUBLUB" },
      {
        property: "og:description",
        content: "A premium, adults-only dice roll for paired partners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpicyPage,
});

const SIDES = [
  "Missionary",
  "Doggy Style",
  "Spoons",
  "Cowgirl",
  "Reverse Cowgirl",
  "69",
  "Standing",
  "Scissors",
];

function SpicyPage() {
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const refresh = useRefreshSession();

  return (
    <AppLayout title="18+ Dice" subtitle="Premium · adults only" critter="seal" critterPose="peek">
      <Link to="/games" className="press mb-3 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
        <ArrowLeft className="size-3.5" /> Back to games
      </Link>

      <PremiumGate
        unlocked={!!profile?.is_premium}
        title="Adults-only section"
        blurb="This section is part of BLUBLUB Premium. Unlock it with a redeem code in Profile & Settings."
      >
        {profile?.adult_confirmed ? (
          <DiceGame />
        ) : (
          <Card className="text-center">
            <Doodle critter="penguin" pose="curious" size={56} className="mx-auto" />
            <h2 className="mt-3 text-lg font-extrabold">Are you 18 or older?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This section contains adult content. We'll only ask once.
            </p>
            <div className="mt-4 space-y-2">
              <PrimaryButton
                onClick={() => {
                  void supabase
                    .from("profiles")
                    .update({ adult_confirmed: true })
                    .eq("id", user!.id)
                    .then(({ error }) => {
                      if (error) toast.error(error.message);
                      else refresh();
                    });
                }}
              >
                Yes, I'm 18+
              </PrimaryButton>
              <Link to="/games" className="block">
                <GhostButton className="w-full">Take me back</GhostButton>
              </Link>
            </div>
          </Card>
        )}
      </PremiumGate>
    </AppLayout>
  );
}

function DiceGame() {
  const [result, setResult] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  function roll() {
    if (rolling) return;
    playChirp("pop");
    setRolling(true);
    const spin = setInterval(() => {
      setResult(SIDES[Math.floor(Math.random() * SIDES.length)]!);
    }, 90);
    setTimeout(() => {
      clearInterval(spin);
      setResult(SIDES[Math.floor(Math.random() * SIDES.length)]!);
      setRolling(false);
      playChirp("success");
    }, 1200);
  }

  return (
    <Card className="text-center">
      <div
        className={`mx-auto grid size-36 place-items-center rounded-3xl bg-accent text-accent-foreground shadow-soft ${
          rolling ? "animate-[pulse_0.4s_ease-in-out_infinite]" : ""
        }`}
        style={{ transform: rolling ? "rotate(8deg)" : "rotate(0deg)", transition: "transform .2s" }}
      >
        <span className="px-3 text-lg font-extrabold leading-tight">{result ?? "Tap to roll"}</span>
      </div>
      <div className="mt-5">
        <PrimaryButton disabled={rolling} onClick={roll}>
          <span className="inline-flex items-center gap-2">
            <Dices className="size-4" /> {rolling ? "Rolling…" : "Roll the 8-sided dice"}
          </span>
        </PrimaryButton>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Eight sides. No pressure — reroll anytime.</p>
    </Card>
  );
}
