// Checks the Look Back story builder. Run: node scripts/lookback-check.ts
import assert from "node:assert/strict";
import {
  buildLookBack,
  slideAt,
  SLIDE_MS,
  timeline,
  type LookPhoto,
} from "../src/lib/lookback-story.ts";

const photo = (id: string, date: string, reactions = 0, comments = 0): LookPhoto => ({
  id,
  url: `https://x/${id}.jpg`,
  caption: null,
  date,
  reactions,
  comments,
});

const base = {
  names: ["Den", "Angel"],
  anniversary: "2020-03-04",
  from: "2026-08-01",
  to: "2026-09-30",
  today: "2026-10-21",
  diary: [
    { who: "Angel", mood: "🥹", title: "Hi bb", body: "I lab u too", date: "2026-08-26" },
    { who: "Den", mood: "🩷", title: "Mybb", body: "x".repeat(400), date: "2026-08-27" },
  ],
  questions: [
    {
      prompt: "Best date?",
      date: "2026-09-02",
      answers: [
        { who: "Den", body: "Ramen" },
        { who: "Angel", body: "Ramen!" },
      ],
    },
  ],
  dreamsDone: 1,
};

// Two months, the most-loved photo first in its month, short diary entry preferred.
const photos = [
  photo("a", "2026-08-03"),
  photo("b", "2026-08-10", 3, 1),
  photo("c", "2026-08-20", 1),
  photo("d", "2026-09-04"),
];
const slides = buildLookBack({ ...base, photos });
const kinds = slides.map((s) => s.kind);

assert.equal(kinds[0], "intro");
assert.equal(kinds[1], "days");
assert.equal(kinds.at(-1), "outro");
assert.equal(kinds.filter((k) => k === "chapter").length, 2, "one chapter per month");
const days = slides.find((s) => s.kind === "days");
assert.ok(
  days && days.kind === "days" && days.days === 2422,
  "days together counted from the anniversary",
);
const diary = slides.find((s) => s.kind === "diary");
assert.ok(
  diary && diary.kind === "diary" && diary.entry.body === "I lab u too",
  "short diary entry wins",
);
const top = slides.find((s) => s.kind === "top");
assert.ok(
  top && top.kind === "top" && top.photo.id === "b",
  "most hearts + comments is the top memory",
);
const intro = slides[0];
assert.ok(
  intro?.kind === "intro" && intro.cover === "https://x/b.jpg",
  "the top memory is the cover",
);
const augPhotos = slides.filter((s) => s.kind === "photo" && s.photo.date.startsWith("2026-08"));
assert.deepEqual(
  augPhotos.map((s) => s.kind === "photo" && s.photo.id),
  ["a", "b", "c"],
  "best photos shown in date order",
);
assert.ok(kinds.includes("question") && kinds.includes("numbers"));

// A month with only a question still counts it as a memory (never "0 memories").
const onlyQuestion = buildLookBack({ ...base, photos: [], diary: [] });
const sep = onlyQuestion.find((s) => s.kind === "chapter");
assert.ok(sep?.kind === "chapter" && sep.memories === 1);

// A long range keeps the story short: at most 2 photos per month past 8 months.
const many = Array.from({ length: 12 }, (_, m) =>
  [1, 2, 3, 4, 5].map((d) => photo(`${m}-${d}`, `2025-${String(m + 1).padStart(2, "0")}-0${d}`)),
).flat();
const long = buildLookBack({
  ...base,
  from: "2025-01-01",
  to: "2025-12-31",
  photos: many,
  diary: [],
  questions: [],
});
assert.equal(long.filter((s) => s.kind === "photo").length, 24);
assert.equal(
  long.find((s) => s.kind === "top"),
  undefined,
  "no top memory when nothing has hearts",
);

// "All time" from long ago: the cover starts at the first memory.
const allTime = buildLookBack({ ...base, from: "2000-01-01", photos });
assert.ok(
  allTime[0]?.kind === "intro" &&
    allTime[0].range.includes("2026") &&
    !allTime[0].range.includes("2000"),
);

// The video timeline: slides back to back, nothing skipped at the joins.
const tl = timeline(slides);
assert.equal(
  tl.total,
  slides.reduce((n, s) => n + SLIDE_MS[s.kind], 0),
);
assert.deepEqual(slideAt(tl.starts, 0), { index: 0, t: 0 });
assert.deepEqual(slideAt(tl.starts, SLIDE_MS.intro - 1), { index: 0, t: SLIDE_MS.intro - 1 });
assert.deepEqual(slideAt(tl.starts, SLIDE_MS.intro), { index: 1, t: 0 });
assert.equal(slideAt(tl.starts, tl.total + 500).index, slides.length - 1);

// Nothing at all still gives a tiny story, never a crash.
const empty = buildLookBack({
  ...base,
  anniversary: null,
  photos: [],
  diary: [],
  questions: [],
  dreamsDone: 0,
});
assert.deepEqual(
  empty.map((s) => s.kind),
  ["intro", "outro"],
);

console.log(`lookback-check ok (${slides.length} slides)`);
