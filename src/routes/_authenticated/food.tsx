import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, RotateCcw, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, GhostButton, PrimaryButton, SectionTitle, TextInput } from "@/components/ui-kit";
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
  const n = options.length;
  const slice = 360 / n;
  const R = 130;
  const toXY = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [160 + r * Math.cos(rad), 160 + r * Math.sin(rad)] as const;
  };

  return (
    <div className="relative mx-auto size-72">
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-2xl leading-none">▼</div>
      <svg
        viewBox="0 0 320 320"
        className="size-72 drop-shadow-sm"
        style={{
          transform: `rotate(${angle}deg)`,
          transition: spinning ? "transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)" : "none",
        }}
      >
        {options.map((o, i) => {
          const start = i * slice;
          const end = (i + 1) * slice;
          const [x1, y1] = toXY(start, R);
          const [x2, y2] = toXY(end, R);
          const mid = start + slice / 2;
          return (
            <g key={o}>
              <path
                d={`M160 160 L${x1} ${y1} A${R} ${R} 0 ${slice > 180 ? 1 : 0} 1 ${x2} ${y2} Z`}
                fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                stroke="var(--color-card)"
                strokeWidth={2}
              />
              <text
                x={160}
                y={160}
                transform={`rotate(${mid} 160 160) translate(0 -${R - 14})`}
                textAnchor="middle"
                dominantBaseline="hanging"
                className="font-display"
                fontSize={n > 5 ? 13 : 15}
                fontWeight={800}
                fill="oklch(0.32 0.05 15)"
                style={{ letterSpacing: "-0.01em" }}
              >
                {o}
              </text>
            </g>
          );
        })}
        <circle cx={160} cy={160} r={34} fill="var(--color-card)" stroke="var(--color-border)" strokeWidth={2} />
      </svg>
      <div className="pointer-events-none absolute left-1/2 top-1/2 grid size-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center">
        <Doodle critter="cat" pose="curious" size={48} />
      </div>
    </div>
  );
}

const TABS = [
  { id: "classic", label: "Classic roulette" },
  { id: "custom", label: "Your own list" },
] as const;

function FoodPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("classic");

  return (
    <AppLayout title="Food Roulette" subtitle="Narrow it down, one spin at a time" critter="cat">
      <Link to="/games" className="press mb-3 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
        <ArrowLeft className="size-3.5" /> Back to games
      </Link>

      <div className="card-soft mb-3 grid grid-cols-2 gap-1 p-1.5">
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

      {tab === "classic" ? <ClassicRoulette /> : <CustomRoulette />}
    </AppLayout>
  );
}

function ClassicRoulette() {
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
    <>
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
    </>
  );
}

const STORAGE_KEY = "blublub.food.custom-options";
const MAX_OPTIONS = 12;

function CustomRoulette() {
  const [options, setOptions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Keep the list on the device so the spots around you stick between visits.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setOptions(parsed.filter((v): v is string => typeof v === "string"));
      }
    } catch {
      // ignore unreadable storage
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch {
      // ignore full/blocked storage
    }
  }, [options, loaded]);

  function add() {
    const value = draft.trim();
    if (!value || options.length >= MAX_OPTIONS) return;
    if (options.some((o) => o.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    playChirp("tap");
    setOptions((o) => [...o, value]);
    setDraft("");
    setResult(null);
  }

  function remove(name: string) {
    setOptions((o) => o.filter((v) => v !== name));
    setResult(null);
  }

  function spin() {
    if (spinning || options.length < 2) return;
    playChirp("pop");
    const slice = 360 / options.length;
    const pick = Math.floor(Math.random() * options.length);
    const target = 360 * (4 + Math.floor(Math.random() * 3)) - (pick * slice + slice / 2);
    setSpinning(true);
    setResult(null);
    setAngle((a) => a + ((target - (a % 360)) + 360) % 360 + 1440);
    setTimeout(() => {
      setSpinning(false);
      setResult(options[pick]!);
      playChirp("success");
    }, 4100);
  }

  return (
    <>
      <Card>
        <p className="mb-3 text-center text-sm font-bold">
          {options.length < 2 ? "Add at least 2 places or dishes" : "Your wheel"}
        </p>
        {options.length >= 2 ? (
          <Wheel options={options} angle={angle} spinning={spinning} />
        ) : (
          <div className="grid place-items-center py-8">
            <Doodle critter="cat" pose="curious" size={64} />
          </div>
        )}

        {result ? (
          <div className="mt-4 rounded-2xl bg-accent px-4 py-3 text-center text-accent-foreground">
            <p className="text-xs font-bold uppercase tracking-wide opacity-70">Tonight it's</p>
            <p className="mt-1 text-xl font-extrabold">{result}</p>
          </div>
        ) : null}

        <div className="mt-5">
          <PrimaryButton disabled={spinning || options.length < 2} onClick={spin}>
            {spinning ? "Spinning…" : result ? "Spin again" : "Spin the wheel"}
          </PrimaryButton>
        </div>
      </Card>

      <SectionTitle>Your options ({options.length}/{MAX_OPTIONS})</SectionTitle>
      <Card>
        <div className="flex gap-2">
          <TextInput
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="e.g. Ramen place downstairs"
            maxLength={40}
            disabled={options.length >= MAX_OPTIONS}
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim() || options.length >= MAX_OPTIONS}
            className="press grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-40"
            aria-label="Add option"
          >
            <Plus className="size-5" />
          </button>
        </div>

        {options.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {options.map((o) => (
              <li
                key={o}
                className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-bold text-secondary-foreground"
              >
                {o}
                <button
                  type="button"
                  onClick={() => remove(o)}
                  className="press opacity-60"
                  aria-label={`Remove ${o}`}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Add the spots and dishes actually around you — the list is saved on this device.
          </p>
        )}

        {options.length ? (
          <GhostButton
            className="mt-3 w-full"
            onClick={() => {
              setOptions([]);
              setResult(null);
            }}
          >
            Clear list
          </GhostButton>
        ) : null}
      </Card>
    </>
  );
}

