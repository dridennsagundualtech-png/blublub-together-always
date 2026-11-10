// Smoke test for the PHONE build. Build it and serve it first:
//   npx vite build --config vite.config.spa.ts
//   npx vite preview --config vite.config.spa.ts --port 4173 --host 127.0.0.1
//   ADMIN=1 BASE=http://127.0.0.1:4173 node scripts/visual/spa-smoke.mjs /tmp/shots/spa
// Like the phone app, it opens the app at "/" and moves around inside it (no page reloads).
import { launch, openPhone, BASE, settle } from "./harness.mjs";

const [, , out = "/tmp/spa"] = process.argv;
const browser = await launch();
const { page, errors } = await openPhone(browser, { signedIn: true, skin: "pixel" });

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}${detail ? ` (${detail})` : ""}`);
};
/** Go to another page the way the app does (no reload). */
const go = async (path) => {
  await page.evaluate((to) => {
    window.history.pushState(null, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await settle(page, 1300);
};

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await settle(page, 2500);
check(
  "home opens and shows the signed-in user",
  (await page.getByText("Den", { exact: true }).count()) > 0,
);
check(
  "there is exactly one page shell",
  (await page.locator("html").count()) === 1 && (await page.locator("body").count()) === 1,
);
const fontLinks = await page.evaluate(() =>
  [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((l) => l.href)
    .filter((h) => h.includes("fonts.googleapis.com")),
);
check(
  "the style fonts are requested",
  fontLinks.some((h) => h.includes("Pixelify+Sans")),
  `${fontLinks.length} font stylesheet link(s)`,
);
check(
  "the Pixel style is applied",
  (await page.evaluate(() => document.documentElement.dataset.skin)) === "pixel",
);
await page.screenshot({ path: `${out}-1-home.png` });

// Tabs.
await page
  .getByRole("link", { name: /^play$/i })
  .first()
  .click();
await settle(page, 1500);
check(
  "Play tab opens Our Room",
  (await page.getByRole("heading", { name: "Our Room" }).count()) === 1,
);
await page
  .getByRole("link", { name: /game corner/i })
  .first()
  .click();
await settle(page, 1500);
check("Game corner opens", (await page.getByRole("heading", { name: "Scoreboard" }).count()) === 1);
await page.screenshot({ path: `${out}-2-hub.png` });

// An arcade game.
await page
  .getByRole("link", { name: /hop up/i })
  .first()
  .click();
await settle(page, 1800);
const canvas = page.locator(".arcade-screen canvas");
check("Hop Up shows its game screen", (await canvas.count()) === 1);
const box = await page.locator(".arcade-screen").boundingBox();
await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3);
await settle(page, 1200);
check("tapping starts a run", await page.getByRole("button", { name: "Pause" }).isEnabled());
const painted = await canvas.evaluate((c) => {
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  const seen = new Set();
  for (let i = 0; i < d.length; i += 4 * 97) seen.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
  return seen.size;
});
check("the game is drawing", painted > 5, `${painted} colours sampled`);
await page.screenshot({ path: `${out}-3-hop.png` });

// A two-player game.
await go("/games/tictactoe");
check(
  "Tic-Tac-Toe start card opens",
  (await page.getByRole("button", { name: /lock in task/i }).count()) === 1,
);

// Daily questions and another data page.
await go("/questions");
check(
  "Daily question page opens",
  (await page.getByRole("heading", { name: "Archive" }).count()) === 1,
);
await go("/nest");
check("Nest opens", (await page.getByText("Nest tools").count()) === 1);

// The owner's page: opens, and explains that it lives in the web app.
await go("/admin-users");
await settle(page, 800);
const notice = await page.getByText(/managed in the web app/i).count();
if (process.env.ADMIN === "1") check("Member access page explains it is web-only", notice === 1);
else
  check(
    "Member access page is closed to non-owners",
    (await page.getByText(/for the owner account/i).count()) === 1,
  );
await page.screenshot({ path: `${out}-4-admin.png` });

const real = [
  ...new Set(
    errors.filter(
      (e) => !/WebSocket|404|ERR_|Failed to load resource|_nonReactive|loadRouteMatch/.test(e),
    ),
  ),
];
check("no page errors", real.length === 0, real.slice(0, 3).join(" | ").slice(0, 300));
console.log(failed === 0 ? "ALL PASSED" : `${failed} FAILED`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
