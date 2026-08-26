import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { useIsAdmin, useSpicyAccess } from "@/lib/admin";
import { DiceRoller, type DieDef } from "@/components/games/DiceRoller";
import { Card, GhostButton, PrimaryButton } from "@/components/ui-kit";
import { Doodle } from "@/components/Doodles";
import { playChirp } from "@/hooks/use-sound";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useProfile, useRefreshSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/spicy")({
  head: () => ({
    meta: [
      { title: "Game corner — BLUBLUB" },
      { name: "description", content: "Cosy two-player games for paired partners." },
      { property: "og:title", content: "Game corner — BLUBLUB" },
      { property: "og:description", content: "Cosy two-player games for paired partners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpicyPage,
});

const POSITION_DICE: DieDef[] = [
  {
    label: "Focus",
    tone: "tile-pink",
    sides: ["Lips", "Neck", "Chest", "Inner thighs", "Back", "Ears", "Hips", "Wild — you pick"],
  },
  {
    label: "Action",
    tone: "tile-lilac",
    sides: ["Kiss", "Lick", "Nibble", "Massage", "Tease", "Caress", "Breathe on", "Wild — you pick"],
  },
  {
    label: "Position / pace",
    tone: "tile-peach",
    sides: [
      "Missionary",
      "From behind",
      "On top",
      "Spoons",
      "Standing",
      "Slow",
      "Faster",
      "Wild — you pick",
    ],
  },
];

const CLOTHING_DICE: DieDef[] = [
  {
    label: "Remove",
    tone: "tile-sky",
    sides: [
      "Top / shirt",
      "Pants / bottoms",
      "Socks / shoes",
      "Bra / undershirt",
      "Underwear",
      "Wild — partner's choice",
    ],
  },
];

function SpicyPage() {
  const navigate = useNavigate();
  const { data: user } = useAuthUser();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isLoading: adminLoading } = useIsAdmin();
  const spicy = useSpicyAccess();
  const refresh = useRefreshSession();

  const resolving = profileLoading || adminLoading;

  useEffect(() => {
    if (!resolving && !spicy) void navigate({ to: "/games/arcade", replace: true });
  }, [resolving, spicy, navigate]);

  if (resolving || !spicy) return null;

  return (
    <AppLayout title="18+ Dice" subtitle="Premium · adults only" critter="seal" critterPose="peek">
      <Link to="/games/arcade" className="press mb-3 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
        <ArrowLeft className="size-3.5" /> Back to games
      </Link>

      <>
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
      </>
    </AppLayout>
  );
}

const TABS = [
  { id: "position", label: "Position dice" },
  { id: "clothing", label: "Clothing removal" },
] as const;

function DiceGame() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("position");

  return (
    <div className="space-y-3">
      <div className="card-soft grid grid-cols-2 gap-1 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              playChirp("tap");
              setTab(t.id);
            }}
            className={`press rounded-2xl py-2 text-xs font-extrabold ${
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "position" ? (
        <DiceRoller
          key="position"
          dice={POSITION_DICE}
          withTimer
          cta="Roll all three"
          footnote="Take turns: the roller performs the combo for the round, then swap. Wild means you choose."
        />
      ) : (
        <DiceRoller
          key="clothing"
          dice={CLOTHING_DICE}
          cta="Roll the clothing dice"
          footnote="Tap to roll — whatever lands, one item comes off. Wild is your partner's choice."
        />
      )}
    </div>
  );
}
