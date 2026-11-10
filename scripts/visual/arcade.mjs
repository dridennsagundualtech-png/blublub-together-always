// Plays an arcade game for a few seconds and takes screenshots.
// node scripts/visual/arcade.mjs <outPrefix> <gameId> [skin] [signedIn 0/1]
import { launch, openPhone, BASE, settle } from "./harness.mjs";

const [, , out, gameId, skin = "-", signed = "0"] = process.argv;
const browser = await launch();
const { page, errors } = await openPhone(browser, {
  signedIn: signed === "1",
  skin: skin === "-" ? null : skin,
  scale: Number(process.env.SCALE || 1),
});
await page.goto(`${BASE}/games/play/${gameId}`, { waitUntil: "domcontentloaded" });
await settle(page, 2000);
await page.screenshot({ path: `${out}-1-ready.png` });

const screen = page.locator(".arcade-screen");
const box = await screen.boundingBox();
const leftX = box.x + box.width * 0.25;
const rightX = box.x + box.width * 0.75;
const midY = box.y + box.height * 0.5;

// Start, then steer / flap for a while.
await page.mouse.move(rightX, midY);
await page.mouse.down();
await settle(page, 500);
await page.mouse.up();
for (let i = 0; i < 14; i += 1) {
  await page.mouse.move(i % 2 ? leftX : rightX, midY);
  await page.mouse.down();
  await settle(page, gameId === "wing" ? 60 : 320);
  await page.mouse.up();
  await settle(page, gameId === "wing" ? 330 : 120);
  if (i === 3) await page.screenshot({ path: `${out}-2-playing.png` });
  if (i === 9) await page.screenshot({ path: `${out}-3-playing.png` });
}
// Pause.
const pause = page.getByRole("button", { name: "Pause" });
if (await pause.isEnabled().catch(() => false)) {
  await pause.click();
  await settle(page, 400);
  await page.screenshot({ path: `${out}-4-paused.png` });
  await page.getByRole("button", { name: "Resume" }).first().click();
}
// Let the run end (do nothing).
await page.waitForSelector('[role="status"]', { timeout: 30000 }).catch(() => {});
await settle(page, 500);
await page.screenshot({ path: `${out}-5-over.png` });
const best = await page.evaluate((id) => localStorage.getItem(`blublub:arcade:best:${id}`), gameId);
console.log("saved best:", best);
const real = errors.filter((e) => !/WebSocket|404/.test(e));
if (real.length) console.log([...new Set(real)].join("\n"));
await browser.close();
