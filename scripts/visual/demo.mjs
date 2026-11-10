// Watches the self-playing title demo of an arcade game and screenshots the game screen.
// node scripts/visual/demo.mjs <outPrefix> <gameId> <seconds,comma,separated> [skin]
import { launch, openPhone, BASE, settle } from "./harness.mjs";

const [, , out, gameId, times = "3,15", skin = "-"] = process.argv;
const browser = await launch();
const { page, errors } = await openPhone(browser, { skin: skin === "-" ? null : skin, scale: 2 });
await page.goto(`${BASE}/games/play/${gameId}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".arcade-screen canvas");
const t0 = Date.now();
for (const t of times.split(",").map(Number)) {
  const wait = t * 1000 - (Date.now() - t0);
  if (wait > 0) await settle(page, wait);
  await page.locator(".arcade-screen").screenshot({ path: `${out}-${t}s.png` });
}
const real = errors.filter((e) => !/WebSocket|404/.test(e));
if (real.length) console.log([...new Set(real)].join("\n"));
await browser.close();
