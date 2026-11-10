// Two phones ("Den" and "Angel") play one of the two-player games against each other on a
// shared pretend database, and screenshots are taken along the way.
// node scripts/visual/play-two-player.mjs <outPrefix> <tictactoe|connect4|memory|rps|war> [skin]
import { launch, openPhone, makeDb, BASE, ME, PARTNER, settle } from "./harness.mjs";

const [, , out, kind, skin = "-"] = process.argv;
const browser = await launch();
const db = makeDb();
const opts = { signedIn: true, db, skin: skin === "-" ? null : skin };
const a = await openPhone(browser, { ...opts, who: ME });
const b = await openPhone(browser, { ...opts, who: PARTNER });
const url = `${BASE}/games/${kind}`;

// The mock has no realtime push; a focus event makes the app refetch, like a push would.
const sync = async (page) => {
  await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
  await settle(page, 450);
};
const shot = (phone, name) => phone.page.screenshot({ path: `${out}-${kind}-${name}.png` });
const state = () => db.games.find((g) => g.kind === kind);
const turnPhone = () => (state().turn === ME ? a : b);
const otherOf = (phone) => (phone === a ? b : a);

await a.page.goto(url, { waitUntil: "domcontentloaded" });
await b.page.goto(url, { waitUntil: "domcontentloaded" });
await settle(a.page, 2200);
await shot(a, "1-start");

// Den locks in a task and starts.
const startButton = a.page.getByRole("button", { name: /lock in task/i });
if (!(await startButton.isDisabled())) console.log("FAIL: start should be disabled with no task");
await a.page.getByPlaceholder(/make coffee/i).fill("Wash the dishes");
await startButton.click();
await settle(a.page, 900);
await sync(b.page);
await shot(a, "2-board-den");
await shot(b, "2-board-angel");

let guard = 0;
const scenario = process.env.SCENARIO || "win"; // win | draw (tictactoe only) | resign
if (scenario === "resign") {
  // Angel gives up: one tap only asks, the second tap resigns and Den wins.
  const flag = b.page.getByRole("button", { name: /give up/i });
  await flag.click();
  await settle(b.page, 300);
  if (state().status !== "playing") console.log("FAIL: one tap must not resign");
  await shot(b, "3-give-up-armed");
  await b.page.getByRole("button", { name: /tap again to give up/i }).click();
  await settle(b.page, 700);
} else if (kind === "tictactoe" && scenario === "draw") {
  for (const m of [0, 1, 2, 4, 3, 5, 7, 6, 8]) {
    const phone = turnPhone();
    await phone.page.getByRole("button", { name: `Square ${m + 1}, empty` }).click();
    await settle(phone.page, 400);
    await sync(otherOf(phone).page);
  }
} else if (kind === "tictactoe") {
  // Den (seat 0) takes the top row; Angel plays the middle row.
  const moves = [0, 3, 1, 4, 2];
  for (const m of moves) {
    const phone = turnPhone();
    // The player who is NOT to move must not be able to play.
    await otherOf(phone)
      .page.getByRole("button", { name: `Square ${m + 1}, empty` })
      .click();
    await settle(phone.page, 150);
    if (state().state.board[m] != null) console.log("FAIL: moved out of turn");
    await phone.page.getByRole("button", { name: `Square ${m + 1}, empty` }).click();
    await settle(phone.page, 500);
    await sync(otherOf(phone).page);
    if (m === 4) await shot(a, "3-mid");
  }
} else if (kind === "connect4") {
  // Den stacks column 1, Angel column 2: Den connects four vertically.
  const cols = [1, 2, 1, 2, 1, 2, 1];
  for (const [i, c] of cols.entries()) {
    const phone = turnPhone();
    await phone.page.getByRole("button", { name: `Drop in column ${c}` }).click();
    if (i === 4) {
      await settle(phone.page, 120);
      await shot(phone, "3-dropping");
    }
    await settle(phone.page, 600);
    await sync(otherOf(phone).page);
    if (i === 5) await shot(b, "3-mid");
  }
} else if (kind === "memory") {
  // Play with perfect memory (the deck is in the saved state) until the board is clear.
  let shots = 0;
  while (state().status === "playing" && guard++ < 40) {
    const phone = turnPhone();
    const s = state().state;
    const hidden = s.deck.map((_, i) => i).filter((i) => !s.matched.includes(i));
    // First turn of the game: flip a deliberate mismatch to see the flip-back.
    const first = hidden[0];
    const pair =
      guard === 1
        ? hidden.find((i) => s.deck[i] !== s.deck[first])
        : hidden.find((i) => i !== first && s.deck[i] === s.deck[first]);
    const cards = phone.page.locator(".flip-scene");
    await cards.nth(first).click();
    await settle(phone.page, 450);
    await cards.nth(pair).click();
    await settle(phone.page, 400);
    if (shots < 2) await shot(phone, `3-flip${++shots}`);
    await settle(phone.page, 1300);
    await sync(a.page);
    await sync(b.page);
  }
} else if (kind === "rps") {
  // Den always throws cat (rock), Angel penguin (scissors): Den wins 2–0.
  while (state().status === "playing" && guard++ < 6) {
    await a.page.getByRole("button", { name: /Rock/ }).click();
    await settle(a.page, 500);
    if (guard === 1) await shot(a, "3-locked");
    await sync(b.page);
    await b.page.getByRole("button", { name: /Scissors/ }).click();
    await settle(b.page, 700);
    await sync(a.page);
    if (guard === 1) await shot(a, "4-after-round");
  }
} else if (kind === "war") {
  while (state().status === "playing" && guard++ < 30) {
    const flip = a.page.getByRole("button", { name: /flip cards/i });
    await flip.click();
    await settle(a.page, 900);
    if (guard === 2) await shot(a, "3-flipped");
    await a.page.getByRole("button", { name: /next round|finish game/i }).click();
    await settle(a.page, 450);
  }
  await sync(b.page);
}

await settle(a.page, 700);
await sync(a.page);
await sync(b.page);
await shot(a, "5-result-den");
await shot(b, "5-result-angel");
const g = state();
console.log(
  `${kind}: status=${g.status} winner=${g.winner_id === ME ? "Den" : g.winner_id === PARTNER ? "Angel" : "none"} draw=${g.is_draw}`,
);

// Scoreboard and history on the hub.
await a.page.goto(`${BASE}/games/arcade`, { waitUntil: "domcontentloaded" });
await settle(a.page, 1500);
await a.page.getByRole("button", { name: /show \(/i }).click();
await settle(a.page, 300);
await a.page.screenshot({ path: `${out}-${kind}-6-hub.png`, fullPage: true });
for (const phone of [a, b]) {
  const real = phone.errors.filter((e) => !/WebSocket|404/.test(e));
  if (real.length) console.log([...new Set(real)].join("\n"));
}
await browser.close();
