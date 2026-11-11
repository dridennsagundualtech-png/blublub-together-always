// Checks the pixel slot machine on the 18+ page: what the reels show is what the result says.
// SPICY=1 node scripts/visual/slot-machine.mjs <outPrefix> [skin]
import { launch, openPhone, BASE, settle } from "./harness.mjs";

const [, , out = "/tmp/slot", skin = "-"] = process.argv;
const browser = await launch();
let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}${detail ? ` (${detail})` : ""}`);
};

/** For every reel: the text sitting on the middle row, read from the screen. */
const onPayline = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".slot-window")].map((w) => {
      const b = w.getBoundingClientRect();
      const hit = document
        .elementsFromPoint(b.left + b.width / 2, b.top + b.height / 2)
        .find((el) => el.classList.contains("slot-cell"));
      const cell = hit?.getBoundingClientRect();
      return {
        text: hit?.textContent ?? null,
        // How far the symbol is from being exactly centred on the row, in px.
        off: cell ? Math.round(cell.top + cell.height / 2 - (b.top + b.height / 2)) : null,
      };
    }),
  );
const ticket = (page) =>
  page.evaluate(() => [...document.querySelectorAll(".px-ticket dd")].map((d) => d.textContent));

const { page, errors } = await openPhone(browser, {
  signedIn: true,
  skin: skin === "-" ? null : skin,
});
await page.goto(`${BASE}/spicy`, { waitUntil: "domcontentloaded" });
await settle(page, 2500);
check("the page opens as a slot machine", (await page.locator(".slot-cabinet").count()) === 1);
const reels = await page.locator(".slot-window").count();
check("three reels", reels === 3, `${reels}`);
check(
  "before the first spin the result row is covered",
  (await page.locator(".slot-cover").count()) === reels,
);
check("no result is shown yet", (await page.locator(".px-ticket").count()) === 0);
await page.screenshot({ path: `${out}-1-idle.png` });

const spinButton = page.getByRole("button", { name: /^spin/i });
const seen = new Set();
for (let round = 1; round <= 5; round += 1) {
  if (round === 3) await page.getByRole("button", { name: "Pull the lever" }).click();
  else await spinButton.click();
  if (round === 1) {
    await settle(page, 650);
    await page.screenshot({ path: `${out}-2-spinning.png` });
    check(
      "the button is locked while spinning",
      await page.getByRole("button", { name: /spinning/i }).isDisabled(),
    );
  }
  await page.waitForSelector(".px-ticket", { timeout: 6000 });
  await settle(page, 350);
  const shown = await onPayline(page);
  const said = await ticket(page);
  const same = shown.length === said.length && shown.every((s, i) => s.text === said[i]);
  const centred = shown.every((s) => s.off !== null && Math.abs(s.off) <= 1);
  check(
    `spin ${round}${round === 3 ? " (lever)" : ""}: reels and result agree, symbols sit exactly on the row`,
    same && centred,
    `${said.join(" | ")}${centred ? "" : ` — off by ${shown.map((s) => s.off).join(",")}px`}`,
  );
  seen.add(said.join("|"));
  if (round === 1) await page.screenshot({ path: `${out}-3-result.png` });
}
check(
  "results vary from spin to spin",
  seen.size >= 3,
  `${seen.size} different results in 5 spins`,
);

// Round timer.
const clock = page.getByRole("timer");
check("timer starts at 01:00", (await clock.innerText()) === "01:00");
await page.getByRole("button", { name: "Start" }).click();
await settle(page, 2300);
const afterStart = await clock.innerText();
check("timer counts down", afterStart === "00:58" || afterStart === "00:57", afterStart);
await page.getByRole("button", { name: "Pause" }).click();
await settle(page, 1300);
check("pause holds the time", (await clock.innerText()) === afterStart);
await page.getByRole("button", { name: "30s" }).click();
check("a preset sets the time", (await clock.innerText()) === "00:30");
await page.getByRole("button", { name: /reset/i }).click();
check("reset restores the chosen time", (await clock.innerText()) === "00:30");

// The other mode has its own machine.
await page.getByRole("button", { name: /clothing/i }).click();
await settle(page, 500);
const reels2 = await page.locator(".slot-window").count();
check(
  "the second mode shows its own reels, not yet spun",
  reels2 >= 1 && (await page.locator(".slot-cover").count()) === reels2,
  `${reels2} reel(s)`,
);
await page.getByRole("button", { name: /^spin/i }).click();
await page.waitForSelector(".px-ticket", { timeout: 6000 });
await settle(page, 350);
const shown2 = await onPayline(page);
const said2 = await ticket(page);
check(
  "second mode: reels and result agree",
  shown2.every((s, i) => s.text === said2[i] && Math.abs(s.off) <= 1),
);
await page.screenshot({ path: `${out}-4-second-mode.png` });

// With "reduce motion" on there is no spinning: the result simply appears.
const calm = await openPhone(browser, { signedIn: true });
await calm.page.emulateMedia({ reducedMotion: "reduce" });
await calm.page.goto(`${BASE}/spicy`, { waitUntil: "domcontentloaded" });
await settle(calm.page, 2200);
await calm.page.getByRole("button", { name: /^spin/i }).click();
await settle(calm.page, 300);
const shown3 = await onPayline(calm.page);
const said3 = await ticket(calm.page);
check(
  "reduce motion: result appears at once and matches the reels",
  said3.length === 3 && shown3.every((s, i) => s.text === said3[i] && Math.abs(s.off) <= 1),
);

const real = [
  ...new Set(
    [...errors, ...calm.errors].filter((e) => !/WebSocket|404|_nonReactive|loadRouteMatch/.test(e)),
  ),
];
check("no page errors", real.length === 0, real.slice(0, 2).join(" | ").slice(0, 300));
console.log(failed === 0 ? "ALL PASSED" : `${failed} FAILED`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
