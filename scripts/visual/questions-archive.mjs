// Checks that old daily-question answers never expire from the Archive.
// node scripts/visual/questions-archive.mjs <outPrefix>
import { launch, openPhone, makeDb, BASE, ME, PARTNER, COUPLE, settle } from "./harness.mjs";

const [, , out = "/tmp/questions"] = process.argv;
const day = (ago) => new Date(Date.now() - ago * 86_400_000).toISOString().slice(0, 10);
let n = 0;
const answer = (ago, who, body) => ({
  id: `a-${String(++n).padStart(5, "0")}`,
  couple_id: COUPLE,
  created_by: who,
  question_id: `q-${ago}`,
  answer_date: day(ago),
  body,
  seen_by_partner: true,
  created_at: `${day(ago)}T10:00:00Z`,
  updated_at: `${day(ago)}T10:00:00Z`,
  questions: { prompt: `Question from ${ago} days ago?` },
});

const db = makeDb();
db.requests = [];
const rows = [];
// Both answered: recent, just past the old 30-day window, and very old.
for (const ago of [2, 10, 45, 200, 400]) {
  rows.push(
    answer(ago, ME, `My answer, ${ago} days ago`),
    answer(ago, PARTNER, `Angel's answer, ${ago} days ago`),
  );
}
rows.push(answer(90, ME, "Only I answered, 90 days ago"));
rows.push(answer(5, PARTNER, "Angel only, 5 days ago"));
rows.push(answer(60, PARTNER, "Angel only, 60 days ago"));
// A long history (more than one page of 1000 rows) to prove nothing is cut off.
for (let ago = 401; ago <= 1000; ago += 1) {
  rows.push(answer(ago, ME, `Bulk mine ${ago}`), answer(ago, PARTNER, `Bulk Angel ${ago}`));
}
db.tables = { question_answers: rows };

const expectAnswered = 5 + 1 + 600; // both-answered + only-me + bulk
const expectMissed = 30 - 2 + 1; // last 30 days minus the 2 I answered, plus the 60-day-old partner-only day

const browser = await launch();
const { page, errors } = await openPhone(browser, { signedIn: true, db });
await page.goto(`${BASE}/questions`, { waitUntil: "domcontentloaded" });
await settle(page, 2200);
await page.getByRole("button", { name: "Open", exact: true }).click();
await settle(page, 1500);

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}${detail ? ` (${detail})` : ""}`);
};

const answeredTab = await page.getByRole("button", { name: /^Answered \(/ }).innerText();
const missedTab = await page.getByRole("button", { name: /^Not answered \(/ }).innerText();
check(
  "all answered days are listed, however old",
  answeredTab === `Answered (${expectAnswered})`,
  answeredTab,
);
check(
  "not-answered = recent skipped days + older days only the partner answered",
  missedTab === `Not answered (${expectMissed})`,
  missedTab,
);
const pages = db.requests.filter((r) => r.table === "question_answers").map((r) => r.offset);
check(
  "the whole history is fetched page by page",
  pages.includes(0) && pages.includes(1000),
  `offsets ${[...new Set(pages)].join(",")}`,
);

check(
  "an answer from 45 days ago is visible",
  (await page.getByText("My answer, 45 days ago").count()) === 1,
);
check(
  "the partner's answer from 45 days ago is visible",
  (await page.getByText("Angel's answer, 45 days ago").count()) === 1,
);
check(
  "an answer from 400 days ago is visible",
  (await page.getByText("My answer, 400 days ago").count()) === 1,
);
await page.screenshot({ path: `${out}-1-answered.png` });

// Walk all the way back to the oldest answer.
let clicks = 0;
while (
  (await page.getByRole("button", { name: /show older answers/i }).count()) > 0 &&
  clicks < 60
) {
  await page.getByRole("button", { name: /show older answers/i }).click();
  clicks += 1;
}
await settle(page, 300);
check(
  "the very oldest answer (1000 days ago) can be reached",
  (await page.getByText("Bulk mine 1000", { exact: true }).count()) === 1,
  `${clicks} taps on "Show older"`,
);
check(
  "the end of the list says so",
  (await page.getByText(/answers are kept forever/i).count()) === 1,
);

// Not answered: the 60-day-old day only the partner answered is still there, with its text hidden.
await page.getByRole("button", { name: /^Not answered \(/ }).click();
await settle(page, 400);
const old = page.locator("li", { hasText: "Question from 60 days ago?" });
check(
  "a 60-day-old question only the partner answered can still be answered",
  (await old.count()) === 1,
);
check(
  "the partner's answer stays hidden until you answer",
  (await page.getByText("Angel only, 60 days ago").count()) === 0,
);
await old.getByRole("button", { name: /answer late/i }).click();
await old.getByPlaceholder(/answer it now/i).fill("Finally answering!");
await old.getByRole("button", { name: /save answer/i }).click();
await settle(page, 1200);
const saved = rows.find((r) => r.body === "Finally answering!");
check(
  "answering late saves against the same question the partner answered",
  saved?.question_id === "q-60" && saved?.answer_date === day(60),
  saved ? `${saved.question_id} ${saved.answer_date}` : "not saved",
);
await page.getByRole("button", { name: /^Answered \(/ }).click();
await settle(page, 500);
check(
  "…and both answers for that day now show under Answered",
  (await page.getByText("Angel only, 60 days ago").count()) === 1 &&
    (await page.getByText("Finally answering!").count()) === 1,
);
await page.screenshot({ path: `${out}-2-after-late-answer.png` });

const real = errors.filter((e) => !/WebSocket|404|_nonReactive|loadRouteMatch/.test(e));
if (real.length) console.log([...new Set(real)].join("\n"));
console.log(failed === 0 ? "ALL PASSED" : `${failed} FAILED`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
