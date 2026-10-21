/**
 * Look Back story (pure): turns your memories into slides, like Facebook's Look Back.
 * Checked by `node scripts/lookback-check.ts`.
 */
export type LookPhoto = {
  id: string;
  url: string;
  caption: string | null;
  date: string;
  reactions: number;
  comments: number;
};
export type LookDiary = {
  who: string;
  mood: string | null;
  title: string | null;
  body: string;
  date: string;
};
export type LookQuestion = {
  prompt: string;
  date: string;
  answers: { who: string; body: string }[];
};

export type Slide =
  | { kind: "intro"; names: string[]; cover: string | null; range: string }
  | { kind: "days"; days: number; since: string }
  | { kind: "chapter"; month: string; year: string; memories: number; cover: string | null }
  | { kind: "photo"; photo: LookPhoto; index: number }
  | { kind: "diary"; entry: LookDiary }
  | { kind: "question"; question: LookQuestion }
  | { kind: "top"; photo: LookPhoto }
  | { kind: "numbers"; items: { label: string; value: number }[] }
  | { kind: "outro"; names: string[] };

/** How long each kind of slide stays up, in ms. */
export const SLIDE_MS: Record<Slide["kind"], number> = {
  intro: 4200,
  days: 4200,
  chapter: 2800,
  photo: 4000,
  diary: 5500,
  question: 6500,
  top: 5000,
  numbers: 6500,
  outro: 6000,
};

export type LookBackData = {
  names: string[];
  anniversary: string | null;
  from: string;
  to: string;
  today: string;
  photos: LookPhoto[];
  diary: LookDiary[];
  questions: LookQuestion[];
  dreamsDone: number;
};

const monthKey = (iso: string) => iso.slice(0, 7);
const dayMs = (iso: string) => Date.parse(`${iso}T00:00:00`);
const nice = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, opts);
const score = (p: LookPhoto) => p.reactions * 2 + p.comments;

/** Turns memories into a story: intro → days → a chapter per month → top memory → numbers → outro. */
export function buildLookBack(d: LookBackData): Slide[] {
  const photos = [...d.photos].sort((a, b) => a.date.localeCompare(b.date));
  const top = [...photos].sort((a, b) => score(b) - score(a) || b.date.localeCompare(a.date))[0];
  const dates = [
    ...photos.map((p) => p.date),
    ...d.diary.map((e) => e.date),
    ...d.questions.map((q) => q.date),
  ];
  // "All time" starts long before your first memory; the cover names when your memories really start.
  const first = [...dates].sort()[0];
  const from = first && first > d.from ? first : d.from;
  const slides: Slide[] = [
    {
      kind: "intro",
      names: d.names,
      cover: top?.url ?? photos.at(-1)?.url ?? null,
      range: `${nice(from, { month: "long", year: "numeric" })} – ${nice(d.to, { month: "long", year: "numeric" })}`,
    },
  ];
  if (d.anniversary && dayMs(d.anniversary) <= dayMs(d.today)) {
    slides.push({
      kind: "days",
      days: Math.round((dayMs(d.today) - dayMs(d.anniversary)) / 86_400_000),
      since: nice(d.anniversary, { day: "numeric", month: "long", year: "numeric" }),
    });
  }

  const months = [...new Set(dates.map(monthKey))].sort();
  // Keep it a 2–3 minute story: fewer photos per month when the range is long.
  const perMonth = months.length <= 4 ? 4 : months.length <= 8 ? 3 : 2;

  for (const m of months) {
    const mPhotos = photos.filter((p) => monthKey(p.date) === m);
    const mDiary = d.diary.filter((e) => monthKey(e.date) === m && e.body.trim());
    const mQuestions = d.questions.filter((q) => monthKey(q.date) === m);
    // The month's best photos (most hearts and comments), shown in the order they happened.
    const best = [...mPhotos]
      .sort((a, b) => score(b) - score(a) || a.date.localeCompare(b.date))
      .slice(0, perMonth)
      .sort((a, b) => a.date.localeCompare(b.date));
    // One diary moment: a short one reads best on a slide.
    const diary =
      [...mDiary].sort((a, b) => a.body.length - b.body.length).find((e) => e.body.length <= 220) ??
      mDiary[0];
    const question = mQuestions[0];
    if (!best.length && !diary && !question) continue;

    slides.push({
      kind: "chapter",
      month: nice(`${m}-01`, { month: "long" }),
      year: m.slice(0, 4),
      memories: mPhotos.length + mDiary.length + mQuestions.length,
      cover: best[0]?.url ?? null,
    });
    best.forEach((photo, i) => {
      slides.push({ kind: "photo", photo, index: i });
      if (i === 1 && diary) slides.push({ kind: "diary", entry: diary });
    });
    if (best.length < 2 && diary) slides.push({ kind: "diary", entry: diary });
    if (question) slides.push({ kind: "question", question });
  }

  if (top && score(top) > 0) slides.push({ kind: "top", photo: top });

  const items = [
    { label: "memories shared", value: photos.length },
    { label: "diary entries", value: d.diary.length },
    { label: "questions answered together", value: d.questions.length },
    { label: "dreams come true", value: d.dreamsDone },
  ].filter((x) => x.value > 0);
  if (items.length) slides.push({ kind: "numbers", items });
  slides.push({ kind: "outro", names: d.names });
  return slides;
}

/** When each slide starts in the video and how long the whole story runs, in ms. */
export function timeline(slides: Slide[]) {
  const starts: number[] = [];
  let total = 0;
  for (const s of slides) {
    starts.push(total);
    total += SLIDE_MS[s.kind];
  }
  return { starts, total };
}

/** Which slide shows at a moment of the video, and how far into it (ms). */
export function slideAt(starts: number[], ms: number) {
  let index = starts.length - 1;
  while (index > 0 && starts[index]! > ms) index -= 1;
  return { index, t: ms - (starts[index] ?? 0) };
}
