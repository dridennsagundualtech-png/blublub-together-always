// node shot.mjs <outPrefix> <skin|-> <signedIn 0/1> <path> [path...]
import { launch, openPhone, BASE, settle } from "./harness.mjs";

const [, , outPrefix, skin, signed, ...paths] = process.argv;
const browser = await launch();
const { page, errors } = await openPhone(browser, {
  signedIn: signed === "1",
  skin: skin === "-" ? null : skin,
});
for (const p of paths) {
  await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
  await settle(page, 1800);
  const name = p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home";
  await page.screenshot({ path: `${outPrefix}-${name}.png`, fullPage: process.env.FULL === "1" });
}
if (errors.length) console.log([...new Set(errors)].slice(0, 12).join("\n"));
await browser.close();
