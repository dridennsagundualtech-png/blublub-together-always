import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "@/components/ui-kit";
import { Doodle } from "@/components/Doodles";
import { playChirp } from "@/hooks/use-sound";

export const Route = createFileRoute("/_authenticated/food")({
  head: () => ({
    meta: [
      { title: "Food Roulette — BLUBLUB" },
      {
        name: "description",
        content: "Spin a protein, a cooking method and a flavour to settle what you're craving.",
      },
      { property: "og:title", content: "Food Roulette — BLUBLUB" },
      {
        property: "og:description",
        content: "Spin a protein, a cooking method and a flavour to settle what you're craving.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FoodPage,
});

const STAGES = [
  { key: "protein", label: "Protein", options: ["Fish", "Beef", "Pork", "Chicken", "Tofu / veg", "Seafood"] },
  { key: "method", label: "Cooking method", options: ["Grilled", "Fried", "Soup / stew", "Steamed", "Roasted", "Raw"] },
  { key: "flavour", label: "Flavour profile", options: ["Spicy", "Savoury / salty", "Sweet-savoury", "Sour / tangy"] },
] as const;

const WHEEL_COLORS = [
  "hsl(345 80% 88%)",
  "hsl(20 85% 90%)",
  "hsl(200 70% 90%)",
  "hsl(280 60% 92%)",
  "hsl(150 55% 89%)",
  "hsl(45 90% 90%)",
];

function Wheel({
  options,
  angle,
  spinning,
}: {
  options: readonly string[];
  angle: number;
  spinning: boolean;
}) {
  const slice = 360 / options.length;
  const gradient = options
    .map((_, i) => `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * slice}deg ${(i + 1) * slice}deg`)
    .join(", ");

  return (
    <div className="relative mx-auto size-64">
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-2xl">▼</div>
      <div
        className="size-64 rounded-full border-4 border-card shadow-soft"
        style={{
          background: `conic-gradient(${gradient})`,
          transform: `rotate(${angle}deg)`,
          transition: spinning ? "transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)" : "none",
        }}
      >
        {options.map((o, i) => (
          <span
            key={o}
            className="absolute left-1/2 top-1/2 origin-left text-[11px] font-extrabold text-foreground"
            style={{
              transform: `rotate(${i * slice + slice / 2}deg) translateX(26px)`,
            }}
          >
            {o}
          </span>
        ))}
      </div>
      <div className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card shadow-soft">
        <Doodle critter="cat" pose="curious" size={40} />
      </div>
    </div>
  );
}

function FoodPage() {
  const [stage, setStage] = useState(0);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState<(string | null)[]>([null, null, null]);

  const current = STAGES[Math.min(stage, STAGES.length - 1)]!;
  const done = stage >= STAGES.length;

  function spin() {
    if (spinning || done) return;
    playChirp("pop");
    const options = current.options;
    const slice = 360 / options.length;
    const pick = Math.floor(Math.random() * options.length);
    // Land the chosen slice under the top pointer, after a few full turns.
    const target = 360 * (4 + Math.floor(Math.random() * 3)) - (pick * slice + slice / 2);
    setSpinning(true);
    setAngle((a) => a + ((target - (a % 360)) + 360) % 360 + 1440);
    setTimeout(() => {
      setSpinning(false);
      setResults((r) => r.map((v, i) => (i === stage ? options[pick]! : v)));
      setStage((s) => s + 1);
      playChirp("success");
    }, 4100);
  }

  function reset() {
    setStage(0);
    setResults([null, null, null]);
  }

  const craving = [results[0], results[1], results[2]].filter(Boolean).join(", ");

  return (
    <AppLayout title="Food Roulette" subtitle="Narrow it down, one spin at a time" critter="cat">
      <Link to="/games" className="press mb-3 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
        <ArrowLeft className="size-3.5" /> Back to games
      </Link>

      <Card>
        {done ? (
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Tonight you're craving
            </p>
            <p className="mt-2 text-2xl font-extrabold text-primary">{craving}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              A general craving on purpose — cook it or find it, whatever's around you.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-center text-sm font-bold">
              Stage {stage + 1} of 3 · {current.label}
            </p>
            <Wheel options={current.options} angle={angle} spinning={spinning} />
          </>
        )}

        <div className="mt-5 space-y-2">
          {!done ? (
            <>
              <PrimaryButton disabled={spinning} onClick={spin}>
                {spinning ? "Spinning…" : `Spin ${current.label.toLowerCase()}`}
              </PrimaryButton>
              {stage === 2 ? (
                <GhostButton className="w-full" onClick={() => setStage(3)}>
                  Skip flavour profile
                </GhostButton>
              ) : null}
            </>
          ) : (
            <PrimaryButton onClick={reset}>
              <span className="inline-flex items-center gap-2">
                <RotateCcw className="size-4" /> Spin again
              </span>
            </PrimaryButton>
          )}
        </div>
      </Card>

      <SectionTitle>Picked so far</SectionTitle>
      <Card>
        <ul className="space-y-1 text-sm">
          {STAGES.map((s, i) => (
            <li key={s.key} className="flex items-center justify-between">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-bold">{results[i] ?? "—"}</span>
            </li>
          ))}
        </ul>
      </Card>
    </AppLayout>
  );
}
